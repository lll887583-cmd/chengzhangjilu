import { DEFAULT_WORD_ITEMS, defaultState } from './data.js?v=20261001e';

const LEGACY_STORAGE_KEY = 'growth-record-demo';
const BACKUP_SCHEMA_VERSION = 1;
const memoryStorage = new Map();
const DEFAULT_PLAN_ITEMS = [
  { title: '读 15 分钟中文', points: 6, category: 'study', planType: 'single' },
  { title: '口算 10 题', points: 8, category: 'study', planType: 'single' },
  { title: '英语听读打卡', points: 8, category: 'study', planType: 'single' }
];

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function storage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: key => memoryStorage.get(key) || null,
    setItem: (key, value) => memoryStorage.set(key, value),
    removeItem: key => memoryStorage.delete(key)
  };
}

function parseStoredState(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serializeState(state) {
  return clone(state);
}

function normalizeLiteracyColor(color) {
  return ['red', 'yellow', 'green'].includes(color) ? color : 'red';
}

function createDefaultWordItems() {
  const now = Date.now();
  return DEFAULT_WORD_ITEMS.map((item, index) => ({
    ...item,
    createdAt: now + index,
    updatedAt: now + index
  }));
}

function mergeWordItems(existingItems) {
  const defaults = createDefaultWordItems();
  const defaultByText = new Map(defaults.map(item => [String(item.text || '').trim().toLowerCase(), item]));
  const seen = new Set();
  const merged = [];

  for (const item of [...defaults, ...(Array.isArray(existingItems) ? existingItems : [])]) {
    const text = String(item?.text || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const preset = defaultByText.get(key);
    merged.push(preset ? { ...preset, color: 'red' } : item);
  }

  return merged;
}

// Persistence and state-normalization helpers only.
// UI rendering lives in views.js; user interactions live in app.js.
export function createDefaultState() {
  return clone(defaultState);
}

export function loadState() {
  const saved = parseStoredState(storage().getItem(LEGACY_STORAGE_KEY));
  if (!saved) return clone(defaultState);
  return normalizeState({ ...clone(defaultState), ...saved });
}

export function saveState(state) {
  normalizeState(state);
  capturePointsDelta(state);
  storage().setItem(LEGACY_STORAGE_KEY, JSON.stringify(serializeState(state)));
}

export function resetState() {
  storage().removeItem(LEGACY_STORAGE_KEY);
  return clone(defaultState);
}

export function addRecord(state, text, delta = 0, meta = {}) {
  state.records.unshift({ text, delta, time: Date.now(), ...meta });
  state.records = state.records.slice(0, 40);
}

export function spend(state, cost, onFail, failMessage = '积分还不够哦，继续完成任务吧。') {
  if (state.points < cost) {
    onFail?.(failMessage);
    return false;
  }
  state.points -= cost;
  return true;
}

export function normalizeState(state) {
  state.points = Math.round(Number(state.points) || 0);
  state.records ||= [];
  state.records = state.records.map(record => ({
    ...record,
    delta: Math.round(Number(record.delta) || 0)
  }));
  state.exchangedRewards ||= [];
  if (!Array.isArray(state.plans) || state.plans.length === 0) {
    state.plans = DEFAULT_PLAN_ITEMS.map((plan, index) => ({
      ...plan,
      id: `default-plan-${index + 1}`,
      done: false,
      createdAt: Date.now()
    }));
  }
  state.mySection ??= null;
  state.pointsSection ||= 'earn';
  // 积分抽奖已下线，商城只保留积分兑换
  state.shopSection = 'exchange';
  state.planningSection ||= 'active';
  state.pointsSort = ['asc', 'desc', 'latest'].includes(state.pointsSort) ? state.pointsSort : 'latest';
  state.shopSort = ['asc', 'desc', 'latest'].includes(state.shopSort) ? state.shopSort : 'asc';
  state.planningDraftType = state.planningDraftType === 'longTerm' ? 'longTerm' : 'single';
  state.customRuleDraftType = state.customRuleDraftType === 'longTerm' ? 'longTerm' : 'single';
  state.customPointRules = Array.isArray(state.customPointRules) ? state.customPointRules : [];
  state.literacyItems = Array.isArray(state.literacyItems) ? state.literacyItems : [];
  state.numberBoardSelections = Array.isArray(state.numberBoardSelections) ? state.numberBoardSelections : [];
  state.additionGame = state.additionGame && typeof state.additionGame === 'object'
    ? state.additionGame
    : null;
  state.pinyinSelections = Array.isArray(state.pinyinSelections) ? state.pinyinSelections : [];
  state.letterSelections = Array.isArray(state.letterSelections) ? state.letterSelections : [];
  state.wordItems = mergeWordItems(state.wordItems);
  state.customDeductRules = Array.isArray(state.customDeductRules) ? state.customDeductRules : [];
  state.hiddenPointRuleIds = Array.isArray(state.hiddenPointRuleIds) ? state.hiddenPointRuleIds : [];
  state.hiddenDeductRuleIds = Array.isArray(state.hiddenDeductRuleIds) ? state.hiddenDeductRuleIds : [];
  state.customShopRewards = Array.isArray(state.customShopRewards) ? state.customShopRewards : [];
  state.hiddenRewardIds = Array.isArray(state.hiddenRewardIds) ? state.hiddenRewardIds : [];
  state.pointRuleOrder = Array.isArray(state.pointRuleOrder) ? state.pointRuleOrder : [];
  state.deductRuleOrder = Array.isArray(state.deductRuleOrder) ? state.deductRuleOrder : [];
  state.calendarMonth ||= null;
  if (state.selectedTab === 'pet') state.selectedTab = 'points';
  // 宠物馆、积分看板已下线：老数据里可能还带着这些字段，清掉避免继续参与云端快照
  delete state.petSection;
  delete state.previewPet;
  delete state.collectedPets;
  delete state.pet;
  delete state.pointsBoardView;
  state.plans = state.plans.map((plan, index) => ({
    title: plan.title || '学习任务',
    points: Math.round(Number(plan.points) || 0),
    category: plan.category || 'study',
    planType: plan.planType === 'longTerm' ? 'longTerm' : 'single',
    id: plan.id || `plan-${plan.createdAt || Date.now()}-${index}`,
    done: Boolean(plan.done),
    createdAt: plan.createdAt || Date.now(),
    completedAt: plan.completedAt || null
  }));
  state.customPointRules = state.customPointRules.map((rule, index) => ({
    id: rule.id || `custom-point-${Date.now()}-${index}`,
    title: rule.title || '自定义任务',
    points: Math.max(1, Math.round(Number(rule.points) || 1)),
    description: rule.description || '',
    planType: rule.planType === 'longTerm' ? 'longTerm' : 'single',
    createdAt: Number(rule.createdAt) || Date.now() + index,
    updatedAt: Number(rule.updatedAt) || Number(rule.createdAt) || Date.now() + index
  }));
  state.literacyItems = state.literacyItems.map((item, index) => ({
    id: item.id || `literacy-${item.createdAt || Date.now()}-${index}`,
    text: String(item.text || '').trim().slice(0, 1),
    color: normalizeLiteracyColor(item.color),
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  })).filter(item => item.text);
  const validNumberSelections = state.numberBoardSelections
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 100);
  state.numberBoardSelections = validNumberSelections.length === 1
    ? [validNumberSelections[0]]
    : [];
  if (state.additionGame) {
    const game = state.additionGame;
    const validQuestions = Array.isArray(game.questions) ? game.questions.map(item => ({
      a: Math.max(0, Math.min(10, Number(item.a) || 0)),
      b: Math.max(0, Math.min(10, Number(item.b) || 0)),
      answer: Math.max(0, Math.min(10, Number(item.answer) || 0)),
      options: Array.isArray(item.options)
        ? item.options.map(value => Math.max(0, Math.min(10, Number(value) || 0))).slice(0, 3)
        : []
    })).filter(item => item.a + item.b <= 10 && item.options.length === 3)
      : [];
    state.additionGame = validQuestions.length
      ? {
        mode: ['easy', 'standard', 'challenge'].includes(game.mode) ? game.mode : 'easy',
        status: ['playing', 'finished'].includes(game.status) ? game.status : 'playing',
        questions: validQuestions,
        currentIndex: Math.max(0, Math.min(validQuestions.length - 1, Number(game.currentIndex) || 0)),
        correctCount: Math.max(0, Math.min(validQuestions.length, Number(game.correctCount) || 0)),
        startedAt: Number(game.startedAt) || Date.now(),
        endsAt: Number(game.endsAt) || Date.now(),
        currentSelection: Number.isInteger(game.currentSelection) ? game.currentSelection : null,
        answeredAt: Number(game.answeredAt) || null,
        finishedAt: Number(game.finishedAt) || null,
        awardedPoints: Math.max(0, Number(game.awardedPoints) || 0),
        completionReason: ['complete', 'timeout'].includes(game.completionReason) ? game.completionReason : null
      }
      : null;
  }
  const validPinyinSelections = state.pinyinSelections
    .map(value => String(value || '').trim())
    .filter(Boolean);
  state.pinyinSelections = validPinyinSelections.length === 1
    ? [validPinyinSelections[0]]
    : [];
  const validLetterSelections = state.letterSelections
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => /^[A-Z]$/.test(value));
  state.letterSelections = validLetterSelections.length === 1
    ? [validLetterSelections[0]]
    : [];
  state.wordItems = state.wordItems.map((item, index) => ({
    id: item.id || `word-${item.createdAt || Date.now()}-${index}`,
    text: String(item.text || '').trim().slice(0, 24),
    translation: String(item.translation || '').trim().slice(0, 24),
    color: normalizeLiteracyColor(item.color),
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  })).filter(item => item.text);
  state.customDeductRules = state.customDeductRules.map((rule, index) => ({
    id: rule.id || `custom-deduct-${Date.now()}-${index}`,
    title: rule.title || '自定义减分',
    points: Math.max(1, Math.round(Number(rule.points) || 1)),
    description: rule.description || '',
    planType: rule.planType === 'longTerm' ? 'longTerm' : 'single',
    createdAt: Number(rule.createdAt) || Date.now() + index,
    updatedAt: Number(rule.updatedAt) || Number(rule.createdAt) || Date.now() + index
  }));
  state.customShopRewards = state.customShopRewards.map((item, index) => ({
    id: item.id || `custom-reward-${Date.now()}-${index}`,
    name: String(item.name || '').trim().slice(0, 24) || '自定义奖励',
    cost: Math.max(1, Math.round(Number(item.cost) || 1)),
    createdAt: Number(item.createdAt) || Date.now() + index,
    updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now() + index
  }));
  state.exchangedRewards = state.exchangedRewards.map((reward, index) => ({
    ...reward,
    exchangeId: reward.exchangeId || `${reward.id || 'reward'}-${reward.time || Date.now()}-${index}`
  }));
  return state;
}

export function exportPersistedState(state) {
  normalizeState(state);
  return serializeState(state);
}

export function buildBackupPayload(state) {
  return {
    app: 'growth-record',
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state: exportPersistedState(state)
  };
}

export function importPersistedState(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid-backup');
  }

  const hasWrappedState = Object.prototype.hasOwnProperty.call(payload, 'state');
  const wrappedPayload = hasWrappedState ? payload : null;
  const rawState = hasWrappedState ? payload.state : payload;

  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    throw new Error('invalid-backup');
  }

  if (wrappedPayload?.version != null && wrappedPayload.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error('unsupported-backup-version');
  }

  return normalizeState({ ...clone(defaultState), ...clone(rawState) });
}

/* ---------- 云端同步用到的本地记账 ----------
 * 这一节只做本地记账，不引用任何云端代码。
 * 积分每变一次就记一条「待同步流水」，单独存在另一个 localStorage 键里：
 * 断网、没登录、云端暂时不可用，都不会丢，下次同步补推即可。
 */

const CLOUD_QUEUE_KEY = 'growth-record-cloud-queue';
const CLOUD_META_KEY = 'growth-record-cloud-meta';
const MAX_CLOUD_QUEUE = 1000;

let lastPersistedPoints = null;
let pendingRevertOpId = null;
let opSeed = 0;

function cloudRead(key, fallback) {
  try {
    const raw = storage().getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function cloudWrite(key, value) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时静默跳过，不能拖累本地主流程
  }
}

export function newOpId() {
  opSeed += 1;
  return `${Date.now().toString(36)}-${opSeed.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloudQueueList() {
  const queue = cloudRead(CLOUD_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

export function cloudQueuePush(op) {
  const queue = cloudQueueList();
  queue.push(op);
  cloudWrite(CLOUD_QUEUE_KEY, queue.slice(-MAX_CLOUD_QUEUE));
}

export function cloudQueueDropIds(opIds) {
  const drop = new Set(opIds);
  cloudWrite(CLOUD_QUEUE_KEY, cloudQueueList().filter(op => !drop.has(op.op_id)));
}

export function cloudQueueClear() {
  cloudWrite(CLOUD_QUEUE_KEY, []);
}

export function cloudMeta() {
  const meta = cloudRead(CLOUD_META_KEY, {});
  if (!meta.deviceId) {
    meta.deviceId = newOpId();
    cloudWrite(CLOUD_META_KEY, meta);
  }
  return meta;
}

export function cloudMetaPatch(patch) {
  const meta = { ...cloudMeta(), ...patch };
  cloudWrite(CLOUD_META_KEY, meta);
  return meta;
}

// 撤回时把被撤回那条流水的 op_id 记下来，
// 下一次 saveState 捕获到的增量会带上这个标记，两台设备都能看出这两条互相抵消。
export function markRevertOp(opId) {
  pendingRevertOpId = typeof opId === 'string' && opId ? opId : null;
}

// 从云端合并回来的积分不是本机新挣的，不能当成一条新流水再记一遍
export function markPointsBaseline(points) {
  lastPersistedPoints = Math.round(Number(points) || 0);
}

// 积分增量的唯一捕获点：任何一处改动积分，最终都会经过 saveState，
// 所以在这里比对前后差值，就能覆盖加分、减分、兑换、抽奖、游戏奖励、撤回、重置等所有路径。
function capturePointsDelta(state) {
  const points = Math.round(Number(state.points) || 0);
  if (lastPersistedPoints === null) {
    lastPersistedPoints = points;
    return;
  }

  const delta = points - lastPersistedPoints;
  lastPersistedPoints = points;

  const newest = Array.isArray(state.records) ? state.records[0] : null;
  const revertedOpId = pendingRevertOpId;
  pendingRevertOpId = null;

  // 撤回 0 分记录时 delta 为 0，也要留一条撤回流水，明细里才能对应上
  if (!delta && !revertedOpId) return;

  cloudQueuePush({
    op_id: newOpId(),
    occurred_at: new Date().toISOString(),
    delta,
    label: revertedOpId ? `撤回：${newest?.text || '积分变动'}` : (newest?.text || '积分变动'),
    category: revertedOpId ? 'revert' : (newest?.category || 'points'),
    meta: revertedOpId ? { revertedOpId } : null
  });
}
