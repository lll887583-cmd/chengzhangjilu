// 「成长记录」云端同步层
//
// 这个文件是「可选能力」：不登录、没网络、SDK 加载失败、当前地址不支持，
// 都必须静默降级，让 app 照旧按本地模式正常使用。任何云端异常都不允许冒泡到业务逻辑。
//
// 同步策略（两条通道，各管各的）：
//
// 1. 积分走「流水」：每次加/减分都在 growth_ledger 追加一条记录。
//    云端积分 = 所有流水 delta 之和。两台设备同时操作只会各追加一条，不会互相覆盖，
//    所以孩子的积分永远不会因为同步冲突而丢。
//
// 2. 其余状态（任务、宠物、设置等）走「快照」：整包存 growth_snapshot，后写覆盖。
//    这类数据冲突代价低，配合数组按 id 求并集，双方的新增都能保住。

// 注意：这里的版本号后缀必须和 app.js 里导入 store.js 的写法完全一致。
// ES 模块按完整 URL 去重，'./store.js' 和 './store.js?v=xxx' 会被当成两个模块分别实例化，
// 那样待同步队列就会出现「写进 A 份、读的是 B 份」的错乱。
import {
  cloudMeta,
  cloudMetaPatch,
  cloudQueueClear,
  cloudQueueDropIds,
  cloudQueueList,
  cloudQueuePush,
  newOpId
} from './store.js?v=20260930b';

// 两个 CDN 互为备用：国内访问 jsDelivr 偶尔不稳定，失败时换 unpkg 再试一次
const SDK_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js',
  'https://unpkg.com/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js'
];

// 下面两个值来自云服务开通时返回的 publicConfig，是唯一可以放进前端的配置。
// publishableKey 只用于标识「是哪个应用」，本身不带任何权限；服务端会校验访问来源域名，
// 所以只有发布后的正式域名能用。如果应用被删除重建，这两个值需要同步更新。
const PUBLIC_CONFIG = {
  endpoint: 'https://growth-record-53859.app.workbuddy.host',
  publishableKey: 'wbpk_6iOn7r1nQyvsvXTDHhqpOw_0ZVHPQGbIeU4yIGeHR5Pc0sSltcG516F'
};

const RELEASE_HOST = 'growth-record-53859.app.workbuddy.host';
const TABLE_LEDGER = 'growth_ledger';
const TABLE_SNAPSHOT = 'growth_snapshot';

const SYNC_DEBOUNCE_MS = 1500;
const AUTO_SYNC_INTERVAL_MS = 180000;

// 首次同步采用云端时，把本机原数据留一份；这是「别把用户数据弄丢」的最后一道保险
const BACKUP_KEY = 'growth-record-cloud-backup';
// 快照被云端覆盖前的兜底备份，单独一个键，不覆盖上面那份完整的
const CONTENT_BACKUP_KEY = 'growth-record-cloud-content-backup';

// 这些是「当前这台设备上的界面状态」，不参与同步。
// 否则平板切到哪一页，家长手机也会跟着跳过去。
const DEVICE_LOCAL_KEYS = new Set([
  'points',
  'records',
  'selectedTab',
  'mySection',
  'pointsSection',
  'shopSection',
  'planningSection',
  'petSection',
  'pointsBoardView',
  'pointsSort',
  'calendarMonth',
  'additionGame',
  'planningDraftType',
  'customRuleDraftType',
  'previewPet'
]);

// 同步时按 id 求并集的列表字段：两边新增的内容都能留住
const ARRAY_MERGE_KEYS = {
  plans: 'id',
  exchangedRewards: 'exchangeId',
  literacyItems: 'id',
  wordItems: 'id',
  customPointRules: 'id',
  customDeductRules: 'id'
};

let client = null;
let sdkPromise = null;
let session = null;
let status = {
  mode: 'checking',
  email: '',
  syncing: false,
  // 后台自动同步为 true：界面不该因为「每分钟跑一次同步」而闪，只保持一行「已同步」
  quiet: false,
  message: '',
  error: '',
  lastSyncedAt: 0,
  pendingCount: 0
};
let listeners = [];
let debounceTimer = null;
let inflight = null;
let intervalTimer = null;
// 标记「此刻正在把云端结果写回本地」。
// 写回会触发一次 saveState → cloudAfterLocalChange，如果不拦一下就会变成同步死循环。
let applyingRemote = false;
// 标记「此刻正在广播状态变化」。
// 广播会让页面重绘（比如账号与同步页），重绘内部又会 persist → cloudAfterLocalChange，
// 如果不拦一下，就会变成「同步完成 → 重绘 → 又排队同步 → 又重绘」的闪烁死循环。
let emitDepth = 0;
let host = {
  getState: () => null,
  applyState: () => {}
};

/* ---------- 对外状态 ---------- */

export function cloudStatus() {
  const meta = cloudMeta();
  return {
    ...status,
    pendingCount: cloudQueueList().length,
    lastSyncedAt: Number(meta.lastSyncedAt) || 0
  };
}

export function cloudOnChange(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(item => item !== listener);
  };
}

/* ---------- 给界面用的文案 ---------- */
//
// 「正在同步…」只在用户自己点「立即同步」时出现；后台自动同步一律静默，
// 界面上只留一行稳定的「已同步」，出问题才变成红色的异常提示。

export function cloudStatusText(current = cloudStatus()) {
  if (!current.lastSyncedAt) return '还没有同步过';
  const timeText = `上次同步：${new Date(current.lastSyncedAt).toLocaleString('zh-CN')}`;
  return current.pendingCount ? `${timeText} · ${current.pendingCount} 条待同步` : timeText;
}

export function cloudStateText(current = cloudStatus()) {
  return current.error ? current.error : '已同步';
}

// 「我的」首页那张卡片右上角的小字
export function cloudOverviewMetaText(current = cloudStatus()) {
  if (current.error) return '同步异常';
  if (current.mode === 'ready') return '已开启同步';
  if (current.mode === 'local-only') return '当前地址不可用';
  if (current.mode === 'error') return '暂不可用';
  return '未开启';
}

// 只有用户主动点的同步才需要「同步中…」这种过程反馈
export function cloudIsBusy(current = cloudStatus()) {
  return Boolean(current.syncing && !current.quiet);
}

function describeSyncError(error) {
  const kind = error?.kind || '';
  if (kind === 'unauthenticated' || kind === 'invalid_grant') {
    return '同步异常：登录状态已失效，请退出后重新登录。';
  }
  if (kind === 'rate_limited') {
    return '同步异常：云端请求太频繁，稍后会自动重试。';
  }
  return '同步异常：云端暂时连不上，积分已保存在本机，稍后会自动重试。';
}

function emit() {
  const snapshot = cloudStatus();
  emitDepth += 1;
  try {
    listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch {
        // 监听方出错不能影响同步本身
      }
    });
  } finally {
    emitDepth -= 1;
  }
}

function setStatus(patch) {
  status = { ...status, ...patch };
  emit();
}

export function cloudAttachHost(adapter) {
  host = { ...host, ...adapter };
}

/* ---------- 环境判定与 SDK 加载 ---------- */

export function cloudIsReleaseHost() {
  if (typeof location === 'undefined') return false;
  return location.hostname === RELEASE_HOST;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window.WorkBuddyCloud) resolve();
      else reject(new Error('sdk-global-missing'));
    };
    script.onerror = () => reject(new Error('sdk-load-failed'));
    document.head.appendChild(script);
  });
}

function loadSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.WorkBuddyCloud) return Promise.resolve(window.WorkBuddyCloud);
  if (!sdkPromise) {
    sdkPromise = (async () => {
      for (const src of SDK_SOURCES) {
        try {
          await loadScript(src);
          if (window.WorkBuddyCloud) return window.WorkBuddyCloud;
        } catch {
          // 这个源不可用，换下一个
        }
      }
      throw new Error('sdk-unavailable');
    })().catch(error => {
      // 失败后允许下次调用重新尝试，不长期锁死
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
}

/* ---------- 初始化 ---------- */

export async function cloudInit() {
  if (!cloudIsReleaseHost()) {
    setStatus({
      mode: 'local-only',
      message: '当前地址不支持账号同步，积分会保存在这台设备上'
    });
    return cloudStatus();
  }

  try {
    const sdk = await loadSdk();
    client = sdk.createWorkBuddyCloud({
      endpoint: PUBLIC_CONFIG.endpoint,
      publishableKey: PUBLIC_CONFIG.publishableKey
    });
  } catch {
    setStatus({
      mode: 'error',
      message: '同步组件加载失败，积分仍会保存在这台设备上'
    });
    return cloudStatus();
  }

  try {
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession || null;
      if (!session) {
        lastSignedOutEmail = status.email || lastSignedOutEmail;
        setStatus({ mode: 'signed-out', email: '', syncing: false, quiet: false, error: '', message: '已退出同步账号' });
      }
    });
    const { data } = await client.auth.getSession();
    session = data || null;
  } catch {
    session = null;
  }

  if (session) {
    setStatus({ mode: 'ready', email: session?.user?.email || '', message: '' });
    // 首次同步也走静默：界面上只体现「已同步」，不闪「正在同步」
    await cloudSync({ silent: true });
    startAutoSync();
  } else {
    setStatus({ mode: 'signed-out', email: '', message: '' });
  }
  return cloudStatus();
}

function startAutoSync() {
  if (intervalTimer) return;
  intervalTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    cloudSync({ silent: true });
  }, AUTO_SYNC_INTERVAL_MS);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && session) cloudSync({ silent: true });
    });
  }
}

/* ---------- 登录 / 注册 / 改密 ---------- */

let pendingEmailOtp = null;
// 刚退出的邮箱，显示在登录页上，避免用户不知道自己刚才用的是哪个号
let lastSignedOutEmail = '';

// 用来判断「这台设备当前在给哪个账号同步」。优先用账号 id，退回邮箱。
function currentAccountKey(current = session) {
  return current?.user?.id
    || current?.user?.email
    || current?.email
    || '';
}

function describeAuthError(error, fallback) {
  if (!error) return fallback;
  const kind = error.kind || '';
  if (kind === 'unauthenticated' || kind === 'invalid_grant') return '邮箱或密码不正确';
  if (kind === 'network' || kind === 'backend-unavailable') return '网络不太好，稍后再试';
  if (kind === 'rate_limited') return '操作太频繁了，等一会儿再试';
  return error.message || fallback;
}

// 登录成功后统一处理：记住账号、开始自动同步
function markSignedIn(email) {
  lastSignedOutEmail = '';
  setStatus({ mode: 'ready', email: email || status.email || '', syncing: false, quiet: false, error: '', message: '' });
  startAutoSync();
}

// SDK 返回的 data 可能直接是 session，也可能包了一层，两种都兼容
function sessionFrom(data) {
  if (!data) return null;
  if (data.session) return data.session;
  if (data.user || data.access_token || data.accessToken) return data;
  return data;
}

export async function cloudSendEmailCode(email) {
  if (!client) return { ok: false, message: '同步还没有准备好' };
  try {
    const { data, error } = await client.auth.sendOtp({ email });
    if (error) return { ok: false, message: describeAuthError(error, '验证码发送失败') };
    pendingEmailOtp = {
      email,
      verificationId: data.verificationId,
      isExistingUser: data.isExistingUser
    };
    return { ok: true, message: '验证码已发送，请查看邮箱' };
  } catch {
    return { ok: false, message: '验证码发送失败，稍后再试' };
  }
}

export function cloudPendingEmail() {
  return pendingEmailOtp?.email || '';
}

export async function cloudVerifyEmailCode({ email, code, password }) {
  if (!client) return { ok: false, message: '同步还没有准备好' };
  const pending = pendingEmailOtp;
  if (!pending || pending.email !== email) {
    return { ok: false, message: '请先获取这个邮箱的验证码' };
  }
  if (!pending.isExistingUser && !password) {
    // 不说「这个邮箱没注册」，只提示还差一个密码，避免泄露账号是否存在
    return { ok: false, needPassword: true, message: '再设置一个密码就能完成登录' };
  }
  try {
    const { data, error } = await client.auth.verifyOtp({
      email: pending.email,
      verificationId: pending.verificationId,
      isExistingUser: pending.isExistingUser,
      token: code,
      password: pending.isExistingUser ? undefined : password
    });
    if (error) return { ok: false, message: describeAuthError(error, '验证码不正确') };
    pendingEmailOtp = null;
    session = sessionFrom(data);
    markSignedIn(email);
    return { ok: true, message: '登录成功' };
  } catch {
    return { ok: false, message: '验证失败，稍后再试' };
  }
}

export async function cloudSignInWithPassword(email, password) {
  if (!client) return { ok: false, message: '同步还没有准备好' };
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: describeAuthError(error, '登录失败') };
    session = sessionFrom(data);
    markSignedIn(email);
    return { ok: true, message: '登录成功' };
  } catch {
    return { ok: false, message: '登录失败，稍后再试' };
  }
}

// 重设密码分两步：先发验证码（拿到 challenge 存着），再用验证码完成重设。
// 和登录验证码一样，第二步绝对不能重新发码。
let pendingReset = null;

export async function cloudRequestPasswordReset(email) {
  if (!client) return { ok: false, message: '同步还没有准备好' };
  try {
    const started = await client.auth.resetPasswordForEmail(email);
    if (started.error) return { ok: false, message: describeAuthError(started.error, '验证码发送失败') };
    pendingReset = { email, challenge: started.data };
    return { ok: true, message: '验证码已发送，请查看邮箱' };
  } catch {
    return { ok: false, message: '验证码发送失败，稍后再试' };
  }
}

export async function cloudCompletePasswordReset(email, code, newPassword) {
  if (!client) return { ok: false, message: '同步还没有准备好' };
  const pending = pendingReset;
  if (!pending || pending.email !== email) {
    return { ok: false, message: '请先获取这个邮箱的验证码' };
  }
  if (!newPassword) return { ok: false, message: '请设置新的密码' };
  try {
    const completed = await pending.challenge.updateUser({ nonce: code, password: newPassword });
    if (completed.error) return { ok: false, message: describeAuthError(completed.error, '重设失败') };
    pendingReset = null;
    session = sessionFrom(completed.data);
    markSignedIn(email);
    return { ok: true, message: '密码已重设，已自动登录' };
  } catch {
    return { ok: false, message: '重设失败，稍后再试' };
  }
}

export async function cloudSignOut() {
  if (!client) return { ok: true, message: '已退出' };
  lastSignedOutEmail = status.email || '';
  try {
    await client.auth.signOut();
  } catch {
    // 退出失败也让本地回到未登录状态
  }
  session = null;
  pendingEmailOtp = null;
  setStatus({ mode: 'signed-out', email: '', syncing: false, quiet: false, error: '', message: '已退出同步账号' });
  return { ok: true, message: '已退出同步账号' };
}

// 退出后给登录界面用的提示：让用户知道刚从哪个账号退出来
export function cloudLastEmail() {
  return lastSignedOutEmail;
}

/* ---------- 同步主流程 ---------- */

export function cloudAfterLocalChange() {
  if (!client || !session) return;
  // 云端合并写回本地时不要再排队，否则每同步一次都会触发下一次同步
  if (applyingRemote) return;
  // 状态广播引起的重绘也不算本地改动：同步状态一变，账号与同步页会重绘，
  // 重绘里的 persist 如果又排队同步，页面就会在「正在同步/已同步」之间反复闪烁
  if (emitDepth > 0) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    cloudSync({ silent: true });
  }, SYNC_DEBOUNCE_MS);
}

// silent = true 表示后台自动同步：不广播「正在同步」，界面保持「已同步」，只有出错才变身红字
export function cloudSync({ silent = false } = {}) {
  if (!client || !session) return Promise.resolve(null);
  if (inflight) return inflight;
  inflight = runSync({ silent })
    .catch(error => {
      setStatus({ syncing: false, quiet: false, message: '', error: describeSyncError(error) });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function runSync({ silent = false } = {}) {
  const state = host.getState();
  if (!state) return;

  if (silent) {
    // 静默同步：只改内部状态，不通知界面，避免「正在同步」来回闪
    status = { ...status, syncing: true, quiet: true };
  } else {
    setStatus({ syncing: true, quiet: false, mode: 'ready', message: '', error: '' });
  }

  // 0. 换邮箱账号的判定：同步元数据（首次同步基线、快照时间戳、待同步队列）
  //    在这台设备上只有一份，但它们是「针对某个账号」的。换了账号还沿用旧的一套，
  //    新账号会被当成已经初始化过、还会把上个账号的待同步流水推给新账号。
  const accountKey = currentAccountKey();
  const beforeMeta = cloudMeta();
  if (accountKey && beforeMeta.accountId !== accountKey) {
    cloudQueueClear();
    cloudMetaPatch({
      accountId: accountKey,
      baselineDone: false,
      remoteSnapshotTs: 0,
      contentHash: ''
    });
  }

  // 1. 先看云端现状
  const remote = await pullLedger();
  const meta = cloudMeta();

  // 2. 首次同步：决定「用本机初始化云端」还是「采用云端已有数据」
  let adoptCloud = false;
  let seeded = false;
  if (!meta.baselineDone) {
    if (remote.ops.length === 0) {
      const localPoints = Math.round(Number(state.points) || 0);
      if (localPoints !== 0 || state.records?.length) {
        cloudQueuePush({
          op_id: newOpId(),
          occurred_at: new Date().toISOString(),
          delta: localPoints,
          label: '云端同步初始化',
          category: 'seed',
          meta: null
        });
      }
      // 本机是数据源头，这次连快照也以本机为准
      seeded = true;
      cloudMetaPatch({ baselineDone: true });
    } else {
      // 云端已经有别人用过的数据：以云端为准，本机原数据留一份备份，不作废
      backupLocalState(state);
      cloudQueueClear();
      cloudMetaPatch({ baselineDone: true });
      adoptCloud = true;
    }
  }

  // 3. 推送本机待同步的流水（采用云端时不推，避免把本机历史重复计入）
  let pushed = [];
  if (!adoptCloud) {
    pushed = await pushLedger();
  }

  const pushedSum = pushed.reduce((sum, op) => sum + (Number(op.delta) || 0), 0);
  const allOps = dedupeOps([...remote.ops, ...pushed.map(toLedgerRow)]);
  const cloudPoints = adoptCloud ? remote.points : remote.points + pushedSum;

  // 4. 快照通道：任务、宠物、设置等。
  //    快照失败不能拖垮积分同步，所以单独兜住异常；
  //    失败时保留原来的 contentHash，避免把「没推上去」误记成「已同步」。
  const localContent = contentOf(state);
  let snapshotResult;
  try {
    snapshotResult = await syncSnapshot(localContent, meta, adoptCloud, seeded);
  } catch {
    snapshotResult = {
      content: localContent,
      remoteTs: Number(meta.remoteSnapshotTs) || 0,
      contentHash: meta.contentHash || ''
    };
  }

  // 5. 合并结果
  const merged = { ...state };
  Object.assign(merged, snapshotResult.content);
  merged.points = cloudPoints;
  merged.records = recordsFromOps(allOps);
  merged.selectedTab = state.selectedTab;
  merged.mySection = state.mySection;

  applyingRemote = true;
  try {
    host.applyState(merged);
  } finally {
    applyingRemote = false;
  }

  const now = Date.now();
  cloudMetaPatch({
    lastSyncedAt: now,
    remoteSnapshotTs: snapshotResult.remoteTs,
    contentHash: snapshotResult.contentHash
  });
  // 成功收尾：清掉异常标记，界面回到「已同步」。
  // 不再输出「已同步 1 条积分变动」这类流水账，免得状态行来回变。
  setStatus({ syncing: false, quiet: false, mode: 'ready', message: '', error: '' });
}

function toLedgerRow(op) {
  return {
    op_id: op.op_id,
    occurred_at: op.occurred_at,
    delta: op.delta,
    label: op.label,
    category: op.category,
    meta: op.meta
  };
}

function dedupeOps(ops) {
  const seen = new Set();
  const result = [];
  ops
    .slice()
    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
    .forEach(op => {
      if (!op?.op_id || seen.has(op.op_id)) return;
      seen.add(op.op_id);
      result.push(op);
    });
  return result;
}

function recordsFromOps(ops) {
  const revertedIds = new Set(
    ops.filter(op => op.meta?.revertedOpId).map(op => op.meta.revertedOpId)
  );
  return ops
    .filter(op => op.category !== 'seed')
    .filter(op => !op.meta?.revertedOpId && !revertedIds.has(op.op_id))
    .slice(0, 40)
    .map(op => ({
      id: op.op_id,
      text: op.label || '积分变动',
      delta: Number(op.delta) || 0,
      time: new Date(op.occurred_at).getTime(),
      ...(op.category && op.category !== 'points' ? { category: op.category } : {})
    }));
}

/* ---------- 数据库读写 ---------- */

async function pullLedger() {
  const { data, error } = await client.database.rpc('growth_sync_pull', { limit_ops: 400 });
  if (error) throw error;
  const payload = Array.isArray(data) ? data[0] : data;
  return {
    points: Number(payload?.points) || 0,
    ops: Array.isArray(payload?.ops) ? payload.ops : []
  };
}

async function pushLedger() {
  const queue = cloudQueueList();
  if (!queue.length) return [];
  const rows = queue.map(toLedgerRow);
  const { error } = await client.database
    .from(TABLE_LEDGER)
    .upsert(rows, { onConflict: 'owner_id,op_id', ignoreDuplicates: true });
  if (error) throw error;
  cloudQueueDropIds(rows.map(row => row.op_id));
  return queue;
}

async function syncSnapshot(localContent, meta, adoptCloud, seeded) {
  const { data, error } = await client.database
    .from(TABLE_SNAPSHOT)
    .select('data, updated_at')
    .maybeSingle();
  if (error) throw error;

  const remoteTs = data?.updated_at ? Date.parse(data.updated_at) : 0;
  const knownRemoteTs = Number(meta.remoteSnapshotTs) || 0;
  const localHash = hashContent(localContent);
  const localChanged = localHash !== (meta.contentHash || '');

  if (adoptCloud && data?.data) {
    return { content: data.data, remoteTs, contentHash: hashContent(data.data) };
  }

  // 云端比我们上次见到的更新 → 说明别的设备推过，采用云端的
  // 但有两种情况例外，必须推本机：
  //   seeded    —— 这次刚用本机数据初始化了云端，本机才是源头
  //   !data     —— 云端还没有快照
  const shouldAdoptRemote = data?.data && remoteTs > knownRemoteTs && !seeded;

  if (shouldAdoptRemote) {
    // 覆盖本地之前先留个底，万一采用错了还能找回来
    backupLocalState(localContent, 'snapshot-adopt-backup', CONTENT_BACKUP_KEY);
    return {
      content: mergeContent(localContent, data.data),
      remoteTs,
      contentHash: hashContent(data.data)
    };
  }

  // 本机有改动 → 推上去
  if (localChanged || !data || seeded) {
    const nowIso = new Date().toISOString();
    const { error: writeError } = await client.database
      .from(TABLE_SNAPSHOT)
      .upsert(
        { data: localContent, updated_at: nowIso, device_id: cloudMeta().deviceId || '' },
        { onConflict: 'owner_id' }
      );
    if (writeError) throw writeError;
    return { content: localContent, remoteTs: Date.parse(nowIso), contentHash: localHash };
  }

  return { content: data.data || localContent, remoteTs, contentHash: localHash };
}

/* ---------- 内容合并 ---------- */

function contentOf(state) {
  const out = {};
  Object.keys(state).forEach(key => {
    if (DEVICE_LOCAL_KEYS.has(key)) return;
    out[key] = state[key];
  });
  return out;
}

function mergeContent(local, remote) {
  const merged = { ...remote };
  Object.entries(ARRAY_MERGE_KEYS).forEach(([key, idKey]) => {
    const localItems = Array.isArray(local?.[key]) ? local[key] : [];
    const remoteItems = Array.isArray(remote?.[key]) ? remote[key] : [];
    const table = new Map();
    remoteItems.forEach(item => table.set(item?.[idKey], item));
    localItems.forEach(item => {
      const id = item?.[idKey];
      if (!table.has(id)) table.set(id, item);
    });
    merged[key] = Array.from(table.values());
  });

  // 宠物图鉴是简单字符串数组，直接求并集
  const localPets = Array.isArray(local?.collectedPets) ? local.collectedPets : [];
  const remotePets = Array.isArray(remote?.collectedPets) ? remote.collectedPets : [];
  merged.collectedPets = Array.from(new Set([...remotePets, ...localPets]));

  return merged;
}

function hashContent(content) {
  const text = JSON.stringify(content ?? null);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return `${text.length}-${hash}`;
}

function backupLocalState(state, reason = 'cloud-adopt-backup', key = BACKUP_KEY) {
  try {
    const payload = {
      app: 'growth-record',
      reason,
      backedUpAt: new Date().toISOString(),
      state
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // 备份失败不影响主流程
  }
}

export function cloudLocalBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
