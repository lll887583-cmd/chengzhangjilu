import { ADDITION_MODES, DEDUCT_RULES, LOTTERY, POINT_RULES, REWARDS } from './data.js?v=20260930i';
import { SIDEBAR_ICONS } from './icons.js?v=20260930i';
import { addRecord, buildBackupPayload, importPersistedState, loadState, markPointsBaseline, markRevertOp, resetState, saveState, spend } from './store.js?v=20260930i';
import { cloudAfterLocalChange, cloudAttachHost, cloudCompletePasswordReset, cloudInit, cloudIsBusy, cloudOnChange, cloudOverviewMetaText, cloudRequestPasswordReset, cloudSendEmailCode, cloudSignInWithPassword, cloudSignOut, cloudStateText, cloudStatus, cloudStatusText, cloudSync, cloudVerifyEmailCode } from './cloud.js?v=20260930i';
import { additionView, calendarView, getShopRewards, goalsView, lettersView, literacyView, myView, numbersView, planningView, pointsView, pinyinView, sectionSwitch, shopView, wordsView } from './views.js?v=20260930i';
import { formatPoints, iconSvg } from './views/shared.js?v=20260930i';

// Interaction controller for the static demo.
// Data config lives in data.js; HTML templates live in views.js; persistence lives in store.js.
let state = loadState();
const app = document.querySelector('#app');
const pointsText = document.querySelector('#pointsText');
const pointsPill = document.querySelector('.points-pill');
const headerSwitch = document.querySelector('#headerSwitch');
const toast = document.querySelector('#toast');
const modal = document.querySelector('#modal');
const appShell = document.querySelector('.app-shell');
const topbar = document.querySelector('.topbar');
const sideNav = document.querySelector('.side-nav');
const sideNavMenu = document.querySelector('#sideNavMenu');
const sideNavToggle = document.querySelector('.side-nav-toggle');
const navDrawer = document.querySelector('#navDrawer');
const navDrawerMenu = document.querySelector('#navDrawerMenu');
const navBackdrop = document.querySelector('.nav-drawer-backdrop');
const navTrigger = document.querySelector('.nav-trigger');
let pendingWriteOff = null;
let pendingRevertRecord = null;
// 「我的 - 账号与同步」里当前显示的表单：password / otp / signup / reset
let cloudUi = { mode: 'password', busy: false };
const ruleContextMenu = document.createElement('div');
ruleContextMenu.id = 'ruleContextMenu';
ruleContextMenu.className = 'rule-context-menu hidden';
ruleContextMenu.setAttribute('role', 'menu');
ruleContextMenu.innerHTML = `<button type="button" role="menuitem" data-rule-context-delete>${iconSvg('trash')}<span>删除</span></button>`;
document.body.appendChild(ruleContextMenu);
const cardActionMenu = document.createElement('div');
cardActionMenu.id = 'cardActionMenu';
cardActionMenu.className = 'card-action-menu hidden';
cardActionMenu.setAttribute('role', 'menu');
cardActionMenu.innerHTML = `
  <button type="button" role="menuitem" data-card-action="edit">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" fill="currentColor"/></svg>
    <span>编辑</span>
  </button>
  <button type="button" role="menuitem" data-card-action="delete">
    ${iconSvg('trash')}
    <span>删除</span>
  </button>`;
document.body.appendChild(cardActionMenu);
let activeRuleContext = null;
let activeCardAction = null;
let ruleLongPressTimer = null;
let ruleLongPressStart = null;
let suppressRuleCardClickUntil = 0;
let skipNextRenderAnimation = false;
let literacyPreviewTouch = null;
let navCollapsed = false;
let additionTimerId = null;
let additionAdvanceTimerId = null;
const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = 'application/json,.json';
importInput.hidden = true;
document.body.appendChild(importInput);

const views = {
  points: () => pointsView(state),
  planning: () => planningView(state),
  calendar: () => calendarView(state),
  literacy: () => literacyView(state),
  numbers: () => numbersView(state),
  addition: () => additionView(state),
  pinyin: () => pinyinView(state),
  letters: () => lettersView(state),
  words: () => wordsView(state),
  shop: () => shopView(state),
  goals: () => goalsView(state),
  my: () => myView(state, cloudUi)
};

const LEARNING_ITEMS = [
  { value: 'numbers', label: '数字', ...SIDEBAR_ICONS.numbers },
  { value: 'addition', label: '加法', ...SIDEBAR_ICONS.addition },
  { value: 'pinyin', label: '拼音', ...SIDEBAR_ICONS.pinyin },
  { value: 'literacy', label: '汉字', ...SIDEBAR_ICONS.literacy },
  { value: 'letters', label: '英文字母', ...SIDEBAR_ICONS.letters },
  { value: 'words', label: '英文单词', ...SIDEBAR_ICONS.words }
];

const NAV_ITEMS = [
  { value: 'points', label: '记录', ...SIDEBAR_ICONS.points },
  ...LEARNING_ITEMS,
  // 任务和日历暂时隐藏，功能保留，需要时取消注释即可恢复
  // { value: 'planning', label: '任务', ...SIDEBAR_ICONS.planning },
  // { value: 'calendar', label: '日历', ...SIDEBAR_ICONS.calendar },
  { value: 'shop', label: '商城', ...SIDEBAR_ICONS.shop },
  { value: 'goals', label: '目标', viewBox: '0 0 24 24', icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' }
];

const DRAWER_EXTRA_ITEMS = [
  { action: 'open-my', label: '我的', ...SIDEBAR_ICONS.my }
];

const NAV_TABS = NAV_ITEMS.map(item => item.value);

// 「我的」不在侧边栏里，但它是合法的页面（由头像/抽屉入口打开）。
// 校验可停留页面时必须把它算进去，否则切到「我的」后会被当成非法页签回退到「记录」。
const UI_TABS = [...NAV_TABS, 'my'];

function isNavTab(tab) {
  return NAV_TABS.includes(tab);
}

function isUiTab(tab) {
  return UI_TABS.includes(tab);
}

function navTone(value) {
  if (['numbers', 'addition'].includes(value)) return 'green';
  if (['literacy', 'pinyin'].includes(value)) return 'orange';
  if (['letters', 'words'].includes(value)) return 'purple';
  return '';
}

function navButton(item, activeTab, extraAttrs = '', mode = 'desktop', variant = 'default') {
  const collapsedAttr = mode === 'desktop' && navCollapsed
    ? `title="${item.label}" aria-label="${item.label}" data-tooltip="${item.label}"`
    : '';
  const iconMarkup = variant === 'text-only'
    ? ''
    : `<svg aria-hidden="true" focusable="false" viewBox="${item.viewBox || '0 0 24 24'}">${item.icon}</svg>`;
  return `
    <button data-tab="${item.value}" class="${item.value === activeTab ? 'active' : ''} ${navTone(item.value) ? `nav-tone-${navTone(item.value)}` : ''} ${variant === 'text-only' ? 'nav-text-only' : ''}" ${collapsedAttr} ${extraAttrs}>
      ${iconMarkup}
      <span>${item.label}</span>
    </button>`;
}

function actionButton(item) {
  return `
    <div class="nav-group">
      <button data-action="${item.action}" type="button">
        <svg aria-hidden="true" focusable="false" viewBox="${item.viewBox || '0 0 24 24'}">${item.icon}</svg>
        <span>${item.label}</span>
      </button>
    </div>`;
}

function renderNavMenu(activeTab, mode = 'desktop') {
  return NAV_ITEMS.map((item, index) => {
    const dividerAfter = index === 0 || item.value === 'words';
    return `
      <div class="nav-group">${navButton(item, activeTab, '', mode)}</div>
      ${dividerAfter ? '<div class="nav-divider" aria-hidden="true"></div>' : ''}
    `;
  }).join('');
}

function renderNavigation(activeTab) {
  appShell.classList.toggle('side-collapsed', navCollapsed);
  sideNav.classList.toggle('collapsed', navCollapsed);
  sideNavToggle?.setAttribute('aria-pressed', navCollapsed ? 'true' : 'false');
  sideNavToggle?.setAttribute('aria-label', navCollapsed ? '展开主导航' : '收起主导航');
  sideNavMenu.innerHTML = renderNavMenu(activeTab, 'desktop');
  sideNavMenu.scrollTop = 0;
  navDrawerMenu.innerHTML = `${renderNavMenu(activeTab, 'drawer')}${DRAWER_EXTRA_ITEMS.map(actionButton).join('')}`;
}

function syncShellVisibility() {
  appShell.classList.remove('logged-out');
  topbar.hidden = false;
  sideNav.hidden = false;
}

function normalizeUiState() {
  if (!isUiTab(state.selectedTab)) {
    state.selectedTab = 'points';
  }
}

// 只跟「这台设备当前看到哪一页」有关的字段：不参与云端同步，也不能被云端数据覆盖。
// 否则同步回来的那一刻，正在看的页面会被拉到别的页去（例如回到「记录-加分」）。
const VIEW_ONLY_KEYS = [
  'selectedTab',
  'mySection',
  'pointsSection',
  'shopSection',
  'planningSection',
  'pointsSort',
  'calendarMonth',
  'additionGame',
  'planningDraftType',
  'customRuleDraftType',
];

function pickViewState(source) {
  return VIEW_ONLY_KEYS.reduce((acc, key) => {
    if (source && key in source) acc[key] = source[key];
    return acc;
  }, {});
}

function persist() {
  normalizeUiState();
  saveState(state);
  pointsText.textContent = formatPoints(state.points);
  pointsPill.classList.toggle('negative', state.points < 0);
  // 每次本地写入后，通知同步层「有东西要推」。没登录或云端不可用时它自己会安静返回。
  cloudAfterLocalChange();
}

/* ---------- 账号与同步 ---------- */

function renderCloudSection({ keepInputs = false } = {}) {
  if (state.mySection !== 'cloud') return;

  // 同步状态一变就会重绘这一块。重绘前先把用户已经填的内容记下来，
  // 重绘后按 name 填回去，免得正在输入的邮箱、验证码被状态刷新清空。
  const draft = keepInputs
    ? Array.from(app.querySelectorAll('[data-cloud-section] [name]')).reduce((acc, field) => {
      acc[field.name] = field.value;
      return acc;
    }, {})
    : null;

  render('my');

  if (!draft) return;
  app.querySelectorAll('[data-cloud-section] [name]').forEach(field => {
    if (draft[field.name] !== undefined) field.value = draft[field.name];
  });
}

function setCloudMode(mode) {
  cloudUi = { ...cloudUi, mode, busy: false };
  renderCloudSection();
}

function setCloudBusy(busy) {
  cloudUi = { ...cloudUi, busy };
  renderCloudSection({ keepInputs: true });
}

async function runCloudTask(task) {
  setCloudBusy(true);
  try {
    const result = await task();
    if (result?.message) showToast(result.message);
    return result;
  } catch (error) {
    console.error('Cloud action failed:', error);
    showToast('操作失败，稍后再试');
    return null;
  } finally {
    setCloudBusy(false);
  }
}

function cloudFormValue(form, name) {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

async function sendCloudCode(form, purpose) {
  const email = cloudFormValue(form, 'email');
  if (!email) {
    showToast('请先填写邮箱');
    return;
  }
  if (purpose === 'reset') {
    await runCloudTask(() => cloudRequestPasswordReset(email));
    return;
  }
  await runCloudTask(() => cloudSendEmailCode(email));
}

async function submitCloudForm(form) {
  const kind = form.dataset.cloudForm;
  const email = cloudFormValue(form, 'email');

  if (kind === 'signup') {
    const result = await runCloudTask(() => cloudVerifyEmailCode({
      email,
      code: cloudFormValue(form, 'code'),
      password: cloudFormValue(form, 'password')
    }));
    if (result?.ok) cloudUi = { mode: 'password', busy: false };
    await afterCloudAuth();
    return;
  }

  if (kind === 'otp') {
    const result = await runCloudTask(() => cloudVerifyEmailCode({ email, code: cloudFormValue(form, 'code') }));
    // 这个邮箱还差一个密码：切到注册表单让用户补上，验证码还能继续用
    if (result?.needPassword) {
      cloudUi = { ...cloudUi, mode: 'signup', busy: false };
      renderCloudSection();
      return;
    }
    if (result?.ok) cloudUi = { mode: 'password', busy: false };
    await afterCloudAuth();
    return;
  }

  if (kind === 'reset') {
    const result = await runCloudTask(() => cloudCompletePasswordReset(
      email,
      cloudFormValue(form, 'code'),
      cloudFormValue(form, 'password')
    ));
    if (result?.ok) cloudUi = { mode: 'password', busy: false };
    await afterCloudAuth();
    return;
  }

  const result = await runCloudTask(() => cloudSignInWithPassword(email, cloudFormValue(form, 'password')));
  if (result?.ok) cloudUi = { mode: 'password', busy: false };
  await afterCloudAuth();
}

function showCloudSignOutConfirm() {
  const email = cloudStatus().email;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <h2>退出同步账号？</h2>
      <p>${email ? `当前账号：${escapeHtml(email)}。<br />` : ''}退出后，这台设备上的积分和记录都还在本机，云端数据也仍然保存在原来的邮箱账号里，用同一个邮箱登录就能继续同步。</p>
      <p>想换邮箱的话：退出后直接用新邮箱登录即可。新邮箱第一次使用时，会用这台设备当前的数据初始化云端；如果那个邮箱已经有云端数据，则会采用云端那一份，本机数据会自动留一份备份。</p>
      <div class="actions">
        <button class="btn danger-soft" type="button" data-action="cloud-signout-confirm">退出账号</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </div>`;
}

async function afterCloudAuth() {
  const status = cloudStatus();
  if (status.mode !== 'ready') {
    renderCloudSection();
    return;
  }
  await cloudSync({ silent: true });
  renderCloudSection();
  showToast('已开启云端同步');
}

function currentLiteracyCountLabel() {
  const count = Array.isArray(state.literacyItems) ? state.literacyItems.length : 0;
  return `${count} 个字`;
}

function currentNumbersCountLabel() {
  const selectedNumber = Array.isArray(state.numberBoardSelections) ? state.numberBoardSelections[0] : null;
  return selectedNumber ? `已选 ${selectedNumber}` : '1-100';
}

function additionRemainingSeconds(game = state.additionGame) {
  if (!game?.endsAt) return 0;
  return Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
}

function currentAdditionLabel() {
  const game = state.additionGame;
  if (game?.status === 'playing') {
    const mode = getAdditionMode(game.mode);
    return `${mode.label} · ${game.currentIndex + 1}/10 · ${additionRemainingSeconds(game)}秒`;
  }
  if (game?.status === 'finished') {
    return `${game.correctCount}/10`;
  }
  return '10 以内';
}

function currentPinyinLabel() {
  const selected = Array.isArray(state.pinyinSelections) ? state.pinyinSelections[0] : '';
  return selected ? `已选 ${selected}` : '拼音网格';
}

function currentLettersLabel() {
  const selected = Array.isArray(state.letterSelections) ? state.letterSelections[0] : '';
  return selected ? `已选 ${selected}` : 'A - Z';
}

function currentWordsLabel() {
  const count = Array.isArray(state.wordItems) ? state.wordItems.length : 0;
  return `${count} 个词`;
}

function wordPreviewFontSize(text) {
  const length = String(text || '').trim().length;
  if (length <= 4) return 168;
  if (length <= 6) return 152;
  if (length <= 8) return 138;
  if (length <= 10) return 124;
  if (length <= 12) return 110;
  return 96;
}

function currentCalendarMonthLabel() {
  const monthBase = state.calendarMonth ? new Date(`${state.calendarMonth}T00:00:00`) : new Date();
  return `${monthBase.getMonth() + 1}月`;
}

function headerAddButton(dataset, label = '新增') {
  return `<button class="header-add-button" type="button" ${dataset} aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor"/></svg></button>`;
}

function pointsSortButton() {
  const labels = { asc: '正序', desc: '倒序', latest: '最新' };
  return `<div class="points-sort-control"><button class="points-sort-button" type="button" data-sort-toggle aria-label="排序" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v13.17l-2.59-2.58L3 16l5 5 5-5-1.41-1.41L9 17.17V4H7Zm8 0-5 5 1.41 1.41L14 7.83V21h2V7.83l2.59 2.58L20 9l-5-5Z" fill="currentColor"/></svg></button><div class="points-sort-menu hidden" data-sort-menu>${Object.entries(labels).map(([value, label]) => `<button type="button" data-points-sort="${value}">${label}</button>`).join('')}</div></div>`;
}

function closePointsSortMenu() {
  document.querySelectorAll('[data-sort-menu]:not(.hidden)').forEach(menu => {
    menu.classList.add('hidden');
    menu.parentElement?.querySelector('[data-sort-toggle]')?.setAttribute('aria-expanded', 'false');
  });
}

function renderHeaderSwitch(tab) {
  const switchers = {
    points: `${sectionSwitch([
      { value: 'earn', label: '加分' },
      { value: 'deduct', label: '减分' }
    ], state.pointsSection || 'earn', 'points-section', 'section-switch--header')}${pointsSortButton()}${headerAddButton('data-open-custom-rule="shared"')}`,
    shop: `${sectionSwitch([
      { value: 'exchange', label: '积分兑换' },
      { value: 'lottery', label: '积分抽奖' }
    ], state.shopSection || 'exchange', 'shop-section', 'section-switch--header')}${(state.shopSection || 'exchange') === 'exchange' ? headerAddButton('data-open-shop-item', '新增兑换项目') : ''}`,
    planning: `${sectionSwitch([
      { value: 'active', label: '任务中' },
      { value: 'done', label: '已完成' }
    ], state.planningSection || 'active', 'planning-section', 'section-switch--header')}${state.planningSection !== 'done' ? headerAddButton('data-open-plan-modal') : ''}`,
    calendar: `<div class="calendar-month-badge" aria-live="polite">${currentCalendarMonthLabel()}</div>`,
    literacy: `<div class="status-badge" aria-live="polite">${currentLiteracyCountLabel()}</div>${headerAddButton('data-literacy-create')}`,
    numbers: `<div class="status-badge" aria-live="polite">${currentNumbersCountLabel()}</div>`,
    addition: `<div class="status-badge" aria-live="polite">${currentAdditionLabel()}</div>`,
    pinyin: `<div class="status-badge" aria-live="polite">${currentPinyinLabel()}</div>`,
    letters: `<div class="status-badge" aria-live="polite">${currentLettersLabel()}</div>`,
    words: `<div class="status-badge" aria-live="polite">${currentWordsLabel()}</div>${headerAddButton('data-word-create')}`
  };

  headerSwitch.innerHTML = switchers[tab] || '';
  headerSwitch.hidden = !switchers[tab];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  speakToast(message);
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function speakToast(message) {
  speakMessage(message);
}

function speakMessage(message, { onend } = {}) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  const spokenText = message
    .replace(/[\u2B50\u{1F31F}\u{1F331}\u{1F36C}\u{1F4FA}\u{1F389}\u2728\u{1F9F8}\u{1F36A}\u{1F381}\u{1F34E}\u{1FA80}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spokenText) {
    onend?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.95;
  utterance.pitch = 1.08;
  utterance.volume = 1;
  if (typeof onend === 'function') {
    utterance.onend = () => onend();
    utterance.onerror = () => onend();
  }
  window.speechSynthesis.speak(utterance);
}

function spendPoints(cost, failMessage) {
  return spend(state, cost, showToast, failMessage);
}

function dateKey(time = Date.now()) {
  const date = new Date(time);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isBoostEligibleRecord(record) {
  const category = record?.category || '';
  return !['shop', 'system', 'pet'].includes(category)
    && record?.source !== 'lottery-boost';
}

function getDailyNetPoints(targetDateKey = dateKey()) {
  return (state.records || []).reduce((sum, record) => (
    dateKey(record.time) === targetDateKey && isBoostEligibleRecord(record)
      ? sum + (record.delta || 0)
      : sum
  ), 0);
}

function getEffectiveDailyNetPoints(targetDateKey = dateKey()) {
  return Math.max(0, getDailyNetPoints(targetDateKey));
}

function applyInstantDailyPointBoost(multiplier) {
  const totalNetPoints = getEffectiveDailyNetPoints(dateKey());
  const bonus = totalNetPoints * (multiplier - 1);
  state.points += bonus;
    addRecord(state, `今日净积分${multiplier}倍卡生效，立刻奖励 ${formatPoints(bonus)} 积分`, bonus, {
    category: 'points',
    source: 'lottery-boost'
  });
  return { multiplier, bonus };
}

function awardPoints(points, recordText, meta, toastMessage, renderTab) {
  state.points += points;
  addRecord(state, recordText, points, meta);
  showToast(toastMessage);
  persist();
  render(renderTab);
}

function clearAdditionTimers() {
  clearInterval(additionTimerId);
  clearTimeout(additionAdvanceTimerId);
  additionTimerId = null;
  additionAdvanceTimerId = null;
}

function getAdditionMode(modeId) {
  return ADDITION_MODES[modeId] || ADDITION_MODES.easy;
}

function shuffleList(items) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildAdditionOptions(answer) {
  const candidates = shuffleList([
    answer - 2,
    answer - 1,
    answer + 1,
    answer + 2,
    answer - 3,
    answer + 3
  ]).filter(value => value >= 0 && value <= 10 && value !== answer);
  const options = [answer];
  candidates.forEach(value => {
    if (!options.includes(value) && options.length < 3) {
      options.push(value);
    }
  });
  for (let value = 0; value <= 10 && options.length < 3; value += 1) {
    if (!options.includes(value)) options.push(value);
  }
  return shuffleList(options.slice(0, 3));
}

function buildAdditionQuestion(modeId, index, usedKeys) {
  const mode = getAdditionMode(modeId);
  const buckets = {
    easy: [
      [0, 4, 0, 5],
      [0, 5, 0, 6],
      [1, 5, 0, 7]
    ],
    standard: [
      [0, 6, 0, 7],
      [1, 7, 0, 8],
      [2, 8, 0, 10]
    ],
    challenge: [
      [2, 8, 0, 10],
      [3, 9, 0, 10],
      [4, 10, 0, 10]
    ]
  };
  const range = buckets[mode.id][Math.min(buckets[mode.id].length - 1, Math.floor(index / 4))];
  const [aMin, aMax, sumMin, sumMax] = range;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const a = aMin + Math.floor(Math.random() * (aMax - aMin + 1));
    const minB = Math.max(0, sumMin - a);
    const maxB = Math.min(10 - a, sumMax - a);
    if (maxB < minB) continue;
    const b = minB + Math.floor(Math.random() * (maxB - minB + 1));
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    const answer = a + b;
    return { a, b, answer, options: buildAdditionOptions(answer) };
  }

  const fallbackPool = [];
  for (let a = 0; a <= 10; a += 1) {
    for (let b = 0; b <= 10 - a; b += 1) {
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (!usedKeys.has(key)) fallbackPool.push({ a, b, key });
    }
  }
  const fallback = randomFrom(fallbackPool.length ? fallbackPool : [{ a: 0, b: 0, key: '0-0' }]);
  usedKeys.add(fallback.key);
  return {
    a: fallback.a,
    b: fallback.b,
    answer: fallback.a + fallback.b,
    options: buildAdditionOptions(fallback.a + fallback.b)
  };
}

function generateAdditionQuestions(modeId) {
  const usedKeys = new Set();
  return Array.from({ length: 10 }, (_, index) => buildAdditionQuestion(modeId, index, usedKeys));
}

function calculateAdditionReward(game) {
  const basePoints = 5;
  const accuracyPoints = game.correctCount;
  const perfectBonus = game.correctCount === game.questions.length ? 2 : 0;
  return basePoints + accuracyPoints + perfectBonus;
}

function additionResultText(game, mode) {
  return `加法练习（${mode.label}），答对 ${game.correctCount}/${game.questions.length} 题，加分 ${game.awardedPoints} 积分`;
}

function finishAdditionGame(reason = 'complete') {
  const game = state.additionGame;
  if (!game || game.status === 'finished') return;
  clearAdditionTimers();
  game.status = 'finished';
  game.completionReason = reason;
  game.finishedAt = Date.now();
  game.currentSelection = null;
  game.awardedPoints = calculateAdditionReward(game);
  const mode = getAdditionMode(game.mode);
  state.points += game.awardedPoints;
  addRecord(state, additionResultText(game, mode), game.awardedPoints, {
    category: 'study',
    source: 'addition'
  });
  persist();
  showToast(
    reason === 'timeout'
      ? `时间到啦，答对 ${game.correctCount} 题，加分 ${game.awardedPoints} 积分。`
      : `答题完成，答对 ${game.correctCount} 题，加分 ${game.awardedPoints} 积分。`
  );
  if (state.selectedTab === 'addition') {
    render('addition');
  }
}

function syncAdditionUi() {
  const game = state.additionGame;
  if (!game || game.status !== 'playing') return;
  const countdown = additionRemainingSeconds(game);
  headerSwitch.innerHTML = `<div class="status-badge" aria-live="polite">${game.currentIndex + 1}/10 · ${countdown}秒</div>`;
  headerSwitch.hidden = false;
  const countdownNode = app.querySelector('[data-addition-countdown]');
  if (countdownNode) countdownNode.textContent = `${countdown} 秒`;
}

function additionQuestionMarkup(question) {
  return `${question.a} + ${question.b} = <span class="addition-question-mark">?</span>`;
}

function speakAdditionQuestion(question) {
  if (!question) return;
  speakToast(`${question.a}加${question.b}等于几`);
}

function estimateSpeechDuration(message) {
  const plainText = String(message || '')
    .replace(/\s+/g, '')
    .trim();
  return Math.max(2200, plainText.length * 260 + 900);
}

function additionOptionMarkup(option, game, answer) {
  const isAnswered = game.currentSelection !== null;
  const isSelected = game.currentSelection === option;
  const isCorrect = option === answer;
  const tone = !isAnswered
    ? ''
    : isCorrect
      ? 'is-correct'
      : isSelected
        ? 'is-wrong'
        : 'is-idle';

  return `
    <button class="addition-option ${tone}" type="button" data-addition-option="${option}" ${isAnswered ? 'disabled' : ''}>
      <span>${option}</span>
    </button>`;
}

function updateAdditionPlayingDom() {
  const game = state.additionGame;
  if (!game || game.status !== 'playing' || state.selectedTab !== 'addition') return;
  const question = game.questions[game.currentIndex];
  if (!question) return;

  const questionNode = app.querySelector('[data-addition-question]');
  const optionsNode = app.querySelector('[data-addition-options]');
  if (!questionNode || !optionsNode) {
    skipNextRenderAnimation = true;
    render('addition');
    return;
  }

  questionNode.innerHTML = additionQuestionMarkup(question);
  optionsNode.innerHTML = question.options
    .map(option => additionOptionMarkup(option, game, question.answer))
    .join('');
  syncAdditionUi();
}

function ensureAdditionTimer() {
  clearInterval(additionTimerId);
  const game = state.additionGame;
  if (state.selectedTab !== 'addition' || !game || game.status !== 'playing') return;
  if (additionRemainingSeconds(game) <= 0) {
    finishAdditionGame('timeout');
    return;
  }
  syncAdditionUi();
  additionTimerId = window.setInterval(() => {
    const nextGame = state.additionGame;
    if (!nextGame || nextGame.status !== 'playing') {
      clearAdditionTimers();
      return;
    }
    if (additionRemainingSeconds(nextGame) <= 0) {
      finishAdditionGame('timeout');
      return;
    }
    syncAdditionUi();
  }, 1000);
}

function startAdditionGame(modeId) {
  clearAdditionTimers();
  const mode = getAdditionMode(modeId);
  const startedAt = Date.now();
  state.additionGame = {
    mode: mode.id,
    status: 'playing',
    questions: generateAdditionQuestions(mode.id),
    currentIndex: 0,
    correctCount: 0,
    startedAt,
    endsAt: startedAt + mode.seconds * 1000,
    currentSelection: null,
    answeredAt: null,
    finishedAt: null,
    awardedPoints: 0,
    completionReason: null
  };
  persist();
  render('addition');
  window.setTimeout(() => {
    speakAdditionQuestion(state.additionGame?.questions?.[0]);
  }, 360);
}

function advanceAdditionQuestion() {
  const game = state.additionGame;
  if (!game || game.status !== 'playing') return;
  game.currentSelection = null;
  game.answeredAt = null;
  if (game.currentIndex >= game.questions.length - 1) {
    finishAdditionGame('complete');
    return;
  }
  game.currentIndex += 1;
  persist();
  if (state.selectedTab === 'addition') {
    updateAdditionPlayingDom();
  }
  window.setTimeout(() => {
    speakAdditionQuestion(game.questions[game.currentIndex]);
  }, 420);
}

function answerAdditionQuestion(optionValue) {
  const game = state.additionGame;
  if (!game || game.status !== 'playing' || game.currentSelection !== null) return;
  const answer = game.questions[game.currentIndex]?.answer;
  const selectedValue = Number(optionValue);
  if (!Number.isFinite(selectedValue)) return;
  game.currentSelection = selectedValue;
  game.answeredAt = Date.now();
  let feedbackText = '';
  if (selectedValue === answer) {
    game.correctCount += 1;
    feedbackText = `${selectedValue}，答对啦`;
  } else {
    feedbackText = `${selectedValue}，答错了，是${answer}`;
  }
  persist();
  if (state.selectedTab === 'addition') {
    updateAdditionPlayingDom();
  }
  clearTimeout(additionAdvanceTimerId);
  let advanced = false;
  const advanceOnce = () => {
    if (advanced) return;
    advanced = true;
    advanceAdditionQuestion();
  };
  speakMessage(feedbackText, { onend: advanceOnce });
  additionAdvanceTimerId = window.setTimeout(advanceOnce, estimateSpeechDuration(feedbackText));
}

function resetAdditionGame() {
  clearAdditionTimers();
  state.additionGame = null;
  persist();
  render('addition');
}

function normalizeLiteracyColor(color) {
  return ['red', 'yellow', 'green'].includes(color) ? color : 'red';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function backupFileName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  return `growth-record-backup-${stamp}.json`;
}

function exportData() {
  const payload = buildBackupPayload(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('备份文件已导出');
}

async function importDataFromFile(file) {
  const text = await file.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }

  const importedState = importPersistedState(payload);
  state = importedState;
  persist();
  render('my');
}

function openImportPicker() {
  if (!window.confirm('导入会覆盖当前本地数据，是否继续？')) return;
  importInput.value = '';
  importInput.click();
}

function earnPoints(ruleIndex) {
  const [name, points, , category = 'points'] = POINT_RULES[ruleIndex];
  awardPoints(
    points,
    `${name}，加分 ${formatPoints(points)} 积分`,
    { category, source: 'points-rule' },
    `太棒了！加分 ${formatPoints(points)} 积分。`,
    'points'
  );
}

function deductPoints(ruleIndex) {
  const [name, points] = DEDUCT_RULES[ruleIndex];
  state.points -= points;
  addRecord(state, `${name}，减分 ${formatPoints(points)} 积分`, -points, { category: 'deduct' });
  showToast(`已减分 ${formatPoints(points)} 积分。`);
  persist();
  render('points');
}

function earnCustomPoints(ruleId) {
  const rule = (state.customPointRules || []).find(item => item.id === ruleId);
  if (!rule) return;
  awardPoints(
    rule.points,
    `${rule.title}，加分 ${formatPoints(rule.points)} 积分`,
    { category: 'points', source: 'custom-points-rule' },
    `太棒了！加分 ${formatPoints(rule.points)} 积分。`,
    'points'
  );
  if (rule.planType !== 'longTerm') {
    state.customPointRules = state.customPointRules.filter(item => item.id !== ruleId);
    persist();
    render('points');
  }
}

function deductCustomPoints(ruleId) {
  const rule = (state.customDeductRules || []).find(item => item.id === ruleId);
  if (!rule) return;
  state.points -= rule.points;
  addRecord(state, `${rule.title}，减分 ${formatPoints(rule.points)} 积分`, -rule.points, { category: 'deduct', source: 'custom-deduct-rule' });
  showToast(`已减分 ${formatPoints(rule.points)} 积分。`);
  if (rule.planType !== 'longTerm') {
    state.customDeductRules = state.customDeductRules.filter(item => item.id !== ruleId);
  }
  persist();
  render('points');
}

function showCustomRuleModal(ruleType, errorMessage = '', editId = '') {
  const isShared = ruleType === 'shared';
  const isDeduct = isShared ? state.pointsSection === 'deduct' : ruleType === 'deduct';
  const rules = isDeduct ? (state.customDeductRules || []) : (state.customPointRules || []);
  const editingRule = editId ? rules.find(rule => rule.id === editId) : null;
  const draftRuleType = editingRule?.planType === 'longTerm' || state.customRuleDraftType === 'longTerm' ? 'longTerm' : 'single';
  const draftRuleTypeLabel = draftRuleType === 'longTerm' ? '长期' : '单次';
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card custom-rule-modal" data-custom-rule-form="${ruleType}" data-custom-rule-edit="${editId}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>${editId ? (isDeduct ? '编辑减分项目' : '编辑加分项目') : (isShared ? '新增项目' : (isDeduct ? '新增减分项目' : '新增加分项目'))}</h2>
      </div>
      <label class="custom-rule-field">
        <span>内容</span>
        <input name="title" type="text" maxlength="24" autocomplete="off" value="${editingRule ? escapeHtml(editingRule.title) : ''}" placeholder="${isDeduct ? '例如：顶嘴' : '例如：主动整理书包'}" aria-label="内容" required>
      </label>
      <label class="custom-rule-field">
        <span>积分数</span>
        <input name="points" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${editingRule ? editingRule.points : ''}" placeholder="请输入积分数" aria-label="积分数" required>
      </label>
      ${isShared ? `<label class="custom-rule-field custom-rule-select-field"><span>类型</span><div class="inline-radio-group" role="radiogroup" aria-label="项目类型">
        <label class="inline-radio-option ${!isDeduct ? 'is-active' : ''}"><input type="radio" name="ruleAction" value="earn" ${!isDeduct ? 'checked' : ''}><span class="inline-radio-dot" aria-hidden="true"></span><span>加分</span></label>
        <label class="inline-radio-option ${isDeduct ? 'is-active' : ''}"><input type="radio" name="ruleAction" value="deduct" ${isDeduct ? 'checked' : ''}><span class="inline-radio-dot" aria-hidden="true"></span><span>减分</span></label>
      </div></label>` : ''}
      <label class="custom-rule-field custom-rule-select-field"><span>时效</span><div class="inline-radio-group" data-rule-type role="radiogroup" aria-label="时效选项">
        <input type="hidden" name="planType" value="${draftRuleType}">
        <button class="inline-radio-option ${draftRuleType === 'single' ? 'is-active' : ''}" type="button" role="radio" aria-checked="${draftRuleType === 'single' ? 'true' : 'false'}" data-rule-type-option="single"><span class="inline-radio-dot" aria-hidden="true"></span><span>单次</span></button>
        <button class="inline-radio-option ${draftRuleType === 'longTerm' ? 'is-active' : ''}" type="button" role="radio" aria-checked="${draftRuleType === 'longTerm' ? 'true' : 'false'}" data-rule-type-option="longTerm"><span class="inline-radio-dot" aria-hidden="true"></span><span>长期</span></button>
      </div></label>
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  modal.querySelectorAll('[data-rule-action-option]').forEach(option => {
    option.addEventListener('click', event => {
      event.preventDefault();
      const root = option.closest('[data-rule-action]');
      const nextValue = option.dataset.ruleActionOption;
      const hiddenInput = root?.querySelector('input[name="ruleAction"]');
      if (hiddenInput) hiddenInput.value = nextValue;
      root?.querySelectorAll('[data-rule-action-option]').forEach(item => {
        const active = item.dataset.ruleActionOption === nextValue;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    });
  });
  modal.querySelectorAll('input[name="ruleAction"]').forEach(input => {
    input.addEventListener('change', () => {
      modal.querySelectorAll('input[name="ruleAction"]').forEach(item => {
        item.closest('.inline-radio-option')?.classList.toggle('is-active', item.checked);
      });
    });
  });
  setTimeout(() => modal.querySelector('input[name="title"]')?.focus(), 0);
}

function submitCustomRuleForm(form) {
  const data = new FormData(form);
  const ruleType = form.dataset.customRuleForm === 'shared'
    ? (data.get('ruleAction') === 'deduct' ? 'deduct' : 'earn')
    : (form.dataset.customRuleForm === 'deduct' ? 'deduct' : 'earn');
  const title = String(data.get('title') || '').trim();
  const pointsValue = Number(data.get('points'));
  const points = Math.max(1, Math.min(1000, Math.round(pointsValue || 0)));

  if (!title) {
    showCustomRuleModal(ruleType, '请先填写内容。', form.dataset.customRuleEdit || '');
    return;
  }
  if (!Number.isFinite(pointsValue) || pointsValue < 1) {
    showCustomRuleModal(ruleType, '请输入正确的积分数。', form.dataset.customRuleEdit || '');
    return;
  }

  const editId = form.dataset.customRuleEdit || '';
  const existingRule = editId
    ? [...(state.customPointRules || []), ...(state.customDeductRules || [])].find(rule => rule.id === editId)
    : null;
  const nextRule = {
    id: editId || `custom-${ruleType}-${Date.now()}`,
    title,
    points,
    description: '',
    planType: data.get('planType') === 'longTerm' ? 'longTerm' : 'single',
    createdAt: existingRule?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  const collection = ruleType === 'deduct' ? state.customDeductRules : state.customPointRules;
  if (editId) {
    const index = collection.findIndex(rule => rule.id === editId);
    if (index >= 0) collection[index] = nextRule;
  } else {
    collection.unshift(nextRule);
  }
  state.customRuleDraftType = nextRule.planType;
  closeModal();
  showToast(editId ? '项目已更新。' : (ruleType === 'deduct' ? '新的减分项目已添加。' : '新的加分项目已添加。'));
  persist();
  render('points');
}

function showLiteracyPreviewModal(itemId) {
  const items = state.literacyItems || [];
  const index = items.findIndex(entry => entry.id === itemId);
  const item = index >= 0 ? items[index] : null;
  if (!item) return;
  const safeText = escapeHtml(item.text);
  const previewFontSize = wordPreviewFontSize(item.text);
  const total = items.length;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-card literacy-preview-modal" role="dialog" aria-label="字卡详情" data-literacy-preview-active="${item.id}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <button class="literacy-preview-arrow literacy-preview-arrow-left" type="button" data-literacy-preview-move="prev" data-literacy-preview-id="${item.id}" aria-label="查看上一个字卡" ${index <= 0 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M14.71 6.71a1 1 0 0 1 0 1.41L10.83 12l3.88 3.88a1 1 0 0 1-1.42 1.41l-4.58-4.58a1 1 0 0 1 0-1.42l4.58-4.58a1 1 0 0 1 1.42 0Z" fill="currentColor"></path></svg>
      </button>
      <button class="literacy-preview-arrow literacy-preview-arrow-right" type="button" data-literacy-preview-move="next" data-literacy-preview-id="${item.id}" aria-label="查看下一个字卡" ${index >= total - 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0-1.42 0Z" fill="currentColor"></path></svg>
      </button>
      <div class="literacy-preview-char" aria-hidden="true">${safeText}</div>
    </div>`;
}

function moveLiteracyPreview(itemId, direction) {
  const items = state.literacyItems || [];
  const index = items.findIndex(item => item.id === itemId);
  if (index < 0) return;
  const nextIndex = direction === 'prev' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) return;
  showLiteracyPreviewModal(items[nextIndex].id);
}

function handleLiteracyPreviewSwipe(startTouch, endTouch) {
  if (!startTouch || !endTouch) return;
  const deltaX = endTouch.clientX - startTouch.clientX;
  const deltaY = endTouch.clientY - startTouch.clientY;
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  const previewModal = modal.querySelector('[data-literacy-preview-active]');
  if (!previewModal) return;
  moveLiteracyPreview(previewModal.dataset.literacyPreviewActive, deltaX > 0 ? 'prev' : 'next');
}

function showLiteracyModal(itemId, errorMessage = '') {
  const item = (state.literacyItems || []).find(entry => entry.id === itemId);
  if (!item) return;
  const activeColor = normalizeLiteracyColor(item.color);
  const safeText = escapeHtml(item.text);
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card literacy-modal" data-literacy-edit-form="${item.id}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>修改字卡</h2>
      </div>
      <label class="custom-rule-field">
        <span>汉字</span>
        <input name="text" type="text" maxlength="1" autocomplete="off" value="${safeText}" aria-label="修改汉字" required>
      </label>
      <div class="literacy-color-picker" role="radiogroup" aria-label="选择颜色">
        ${[
          ['red', '红色'],
          ['yellow', '黄色'],
          ['green', '绿色']
        ].map(([color, label]) => `
          <button class="literacy-color-option ${color} ${activeColor === color ? 'active' : ''}" type="button" data-literacy-color="${color}" aria-pressed="${activeColor === color}" aria-label="${label}">
            <span aria-hidden="true"></span>
            <em>${label}</em>
          </button>
        `).join('')}
      </div>
      <input type="hidden" name="color" value="${activeColor}">
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
  </form>`;
  setTimeout(() => modal.querySelector('input[name="text"]')?.focus(), 0);
}

function showCreateLiteracyModal(errorMessage = '', currentValue = '') {
  const safeText = escapeHtml(currentValue);
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card literacy-modal" data-literacy-create-form>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>新增汉字卡</h2>
      </div>
      <label class="custom-rule-field">
        <span>汉字</span>
        <input name="text" type="text" maxlength="1" autocomplete="off" value="${safeText}" placeholder="输入 1 个字" aria-label="输入待巩固字" required>
      </label>
      <input type="hidden" name="color" value="red">
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('input[name="text"]')?.focus(), 0);
}

function addLiteracyItem(form) {
  const data = new FormData(form);
  const text = String(data.get('text') || '').trim();
  const char = Array.from(text)[0] || '';
  const color = 'red';
  if (!char) {
    showCreateLiteracyModal('请先输入一个字。', text);
    return;
  }
  if (Array.from(text).length !== 1) {
    showCreateLiteracyModal('一次只能添加 1 个字。', text);
    return;
  }
  if ((state.literacyItems || []).some(item => item.text === char)) {
    showCreateLiteracyModal('这个字已经添加过了。', text);
    return;
  }
  const now = Date.now();
  state.literacyItems ||= [];
  state.literacyItems.unshift({
    id: `literacy-${now}`,
    text: char,
    color,
    createdAt: now,
    updatedAt: now
  });
  closeModal();
  showToast(`已添加：${char}`);
  persist();
  render('literacy');
}

function submitLiteracyEdit(form) {
  const itemId = form.dataset.literacyEditForm;
  const item = (state.literacyItems || []).find(entry => entry.id === itemId);
  if (!item) {
    closeModal();
    return;
  }
  const data = new FormData(form);
  const text = String(data.get('text') || '').trim();
  const char = Array.from(text)[0] || '';
  const color = normalizeLiteracyColor(String(data.get('color') || 'red'));
  if (!char || Array.from(text).length !== 1) {
    showLiteracyModal(itemId, '请只输入 1 个字。');
    return;
  }
  if ((state.literacyItems || []).some(entry => entry.id !== itemId && entry.text === char)) {
    showLiteracyModal(itemId, '这个字已经存在了。');
    return;
  }
  item.text = char;
  item.color = color;
  item.updatedAt = Date.now();
  closeModal();
  showToast('字卡已更新。');
  persist();
  render('literacy');
}

function deleteLiteracyItem(itemId) {
  const beforeCount = (state.literacyItems || []).length;
  state.literacyItems = (state.literacyItems || []).filter(item => item.id !== itemId);
  if (state.literacyItems.length === beforeCount) return;
  showToast('字卡已删除。');
  persist();
  render('literacy');
}

function showWordPreviewModal(itemId) {
  const items = state.wordItems || [];
  const index = items.findIndex(entry => entry.id === itemId);
  const item = index >= 0 ? items[index] : null;
  if (!item) return;
  const safeText = escapeHtml(item.text);
  const safeTranslation = escapeHtml(String(item.translation || '').trim());
  const previewFontSize = wordPreviewFontSize(item.text);
  const total = items.length;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-card literacy-preview-modal word-preview-modal" role="dialog" aria-label="单词卡详情" data-word-preview-active="${item.id}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <button class="literacy-preview-arrow literacy-preview-arrow-left" type="button" data-word-preview-move="prev" data-word-preview-id="${item.id}" aria-label="查看上一个单词卡" ${index <= 0 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M14.71 6.71a1 1 0 0 1 0 1.41L10.83 12l3.88 3.88a1 1 0 0 1-1.42 1.41l-4.58-4.58a1 1 0 0 1 0-1.42l4.58-4.58a1 1 0 0 1 1.42 0Z" fill="currentColor"></path></svg>
      </button>
      <button class="literacy-preview-arrow literacy-preview-arrow-right" type="button" data-word-preview-move="next" data-word-preview-id="${item.id}" aria-label="查看下一个单词卡" ${index >= total - 1 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0-1.42 0Z" fill="currentColor"></path></svg>
      </button>
      <div class="word-preview-copy">
        <div class="literacy-preview-char word-preview-text" aria-hidden="true" style="font-size:${previewFontSize}px">${safeText}</div>
        ${safeTranslation ? `<p class="word-preview-translation">${safeTranslation}</p>` : ''}
      </div>
    </div>`;
}

function moveWordPreview(itemId, direction) {
  const items = state.wordItems || [];
  const index = items.findIndex(item => item.id === itemId);
  if (index < 0) return;
  const nextIndex = direction === 'prev' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) return;
  showWordPreviewModal(items[nextIndex].id);
}

function showWordModal(itemId, errorMessage = '') {
  const item = (state.wordItems || []).find(entry => entry.id === itemId);
  if (!item) return;
  const activeColor = normalizeLiteracyColor(item.color);
  const safeText = escapeHtml(item.text);
  const safeTranslation = escapeHtml(String(item.translation || '').trim());
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card literacy-modal" data-word-edit-form="${item.id}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>修改单词卡</h2>
      </div>
      <label class="custom-rule-field">
        <span>英文单词</span>
        <input name="text" type="text" maxlength="24" autocomplete="off" value="${safeText}" aria-label="修改英文单词" required>
      </label>
      <label class="custom-rule-field">
        <span>翻译</span>
        <input name="translation" type="text" maxlength="24" autocomplete="off" value="${safeTranslation}" placeholder="输入中文翻译" aria-label="修改中文翻译">
      </label>
      <div class="literacy-color-picker" role="radiogroup" aria-label="选择颜色">
        ${[
          ['red', '红色'],
          ['yellow', '黄色'],
          ['green', '绿色']
        ].map(([color, label]) => `
          <button class="literacy-color-option ${color} ${activeColor === color ? 'active' : ''}" type="button" data-literacy-color="${color}" aria-pressed="${activeColor === color}" aria-label="${label}">
            <span aria-hidden="true"></span>
            <em>${label}</em>
          </button>
        `).join('')}
      </div>
      <input type="hidden" name="color" value="${activeColor}">
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
  </form>`;
  setTimeout(() => modal.querySelector('input[name="text"]')?.focus(), 0);
}

function showCreateWordModal(errorMessage = '', currentValue = '', currentColor = 'red', currentTranslation = '') {
  const safeText = escapeHtml(currentValue);
  const safeTranslation = escapeHtml(currentTranslation);
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card literacy-modal" data-word-create-form>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>新增单词卡</h2>
      </div>
      <label class="custom-rule-field">
        <span>英文单词</span>
        <input name="text" type="text" maxlength="24" autocomplete="off" value="${safeText}" placeholder="输入英文单词" aria-label="输入英文单词" required>
      </label>
      <label class="custom-rule-field">
        <span>翻译</span>
        <input name="translation" type="text" maxlength="24" autocomplete="off" value="${safeTranslation}" placeholder="输入中文翻译" aria-label="输入中文翻译">
      </label>
      <input type="hidden" name="color" value="red">
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('input[name="text"]')?.focus(), 0);
}

function addWordItem(form) {
  const data = new FormData(form);
  const rawText = String(data.get('text') || '').trim();
  const text = rawText.replace(/\s+/g, ' ');
  const translation = String(data.get('translation') || '').trim().replace(/\s+/g, ' ');
  const color = normalizeLiteracyColor(String(data.get('color') || 'red'));
  if (!text) {
    showCreateWordModal('请先输入一个英文单词。', rawText, color, translation);
    return;
  }
  if ((state.wordItems || []).some(item => item.text.toLowerCase() === text.toLowerCase())) {
    showCreateWordModal('这个单词已经添加过了。', rawText, color, translation);
    return;
  }
  const now = Date.now();
  state.wordItems ||= [];
  state.wordItems.unshift({
    id: `word-${now}`,
    text,
    translation,
    color,
    createdAt: now,
    updatedAt: now
  });
  closeModal();
  showToast(`已添加：${text}`);
  persist();
  render('words');
}

function submitWordEdit(form) {
  const itemId = form.dataset.wordEditForm;
  const item = (state.wordItems || []).find(entry => entry.id === itemId);
  if (!item) {
    closeModal();
    return;
  }
  const data = new FormData(form);
  const rawText = String(data.get('text') || '').trim();
  const text = rawText.replace(/\s+/g, ' ');
  const translation = String(data.get('translation') || '').trim().replace(/\s+/g, ' ');
  const color = normalizeLiteracyColor(String(data.get('color') || 'red'));
  if (!text) {
    showWordModal(itemId, '请先输入一个英文单词。');
    return;
  }
  if ((state.wordItems || []).some(entry => entry.id !== itemId && entry.text.toLowerCase() === text.toLowerCase())) {
    showWordModal(itemId, '这个单词已经存在了。');
    return;
  }
  item.text = text;
  item.translation = translation;
  item.color = color;
  item.updatedAt = Date.now();
  closeModal();
  showToast('单词卡已更新。');
  persist();
  render('words');
}

function deleteWordItem(itemId) {
  const beforeCount = (state.wordItems || []).length;
  state.wordItems = (state.wordItems || []).filter(item => item.id !== itemId);
  if (state.wordItems.length === beforeCount) return;
  showToast('单词卡已删除。');
  persist();
  render('words');
}

function exchangeReward(id) {
  // 内置项目和自定义项目都能兑换，所以统一从合并后的列表里找
  const reward = getShopRewards(state).find(item => item.id === id);
  if (!reward) return;
  if (!spendPoints(reward.cost)) return;
  const time = Date.now();
  state.exchangedRewards.unshift({
    id: reward.id,
    name: reward.name,
    cost: reward.cost,
    // 自定义项目没有图标，统一补一个礼物图标，「我的 → 我的兑换」里才不会空着
    icon: reward.icon || 'gift',
    exchangeId: `${reward.id}-${time}`,
    time,
    redeemedAt: null
  });
  addRecord(state, `兑换了「${reward.name}」`, -reward.cost, { category: 'shop' });
  showToast(`兑换成功：${reward.name}，可在我的里查看。`);
  persist();
  render('shop');
}

function createMathChallenge() {
  if (Math.random() < 0.5) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * (10 - a)) + 1;
    return { a, b, op: '+', answer: a + b };
  }

  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * a) + 1;
  return { a, b, op: '-', answer: a - b };
}

function showWriteOffModal(errorMessage = '') {
  if (!pendingWriteOff) return;
  const reward = state.exchangedRewards.find(item => item.exchangeId === pendingWriteOff.exchangeId);
  if (!reward || reward.redeemedAt) {
    closeModal();
    return;
  }
  const { a, b, op } = pendingWriteOff.challenge;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card math-verify-card" data-write-off-form>
      <h2>核销验证</h2>
      <p class="big-copy">答对 10 以内加减法后，才可以核销「${reward.name}」。</p>
      <label class="math-question">
        <span>${a} ${op} ${b} = ?</span>
        <input id="writeOffAnswer" type="number" inputmode="numeric" autocomplete="off" placeholder="答案" aria-label="请输入答案">
      </label>
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : '<p class="math-hint">答错也没关系，可以继续尝试。</p>'}
      <div class="actions">
        <button class="btn secondary" type="submit">提交答案</button>
        <button class="btn ghost" type="button" data-action="close-modal">稍后再核销</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('#writeOffAnswer')?.focus(), 0);
}

function requestWriteOffVerification(exchangeId) {
  const reward = state.exchangedRewards.find(item => item.exchangeId === exchangeId);
  if (!reward || reward.redeemedAt) return;
  pendingWriteOff = { exchangeId, challenge: createMathChallenge() };
  showWriteOffModal();
}

function submitWriteOffVerification() {
  if (!pendingWriteOff) return;
  const input = modal.querySelector('#writeOffAnswer');
  const answer = Number(input?.value);
  if (!input?.value.trim() || answer !== pendingWriteOff.challenge.answer) {
    showWriteOffModal('还不对哦，请再算一遍。');
    return;
  }
  const exchangeId = pendingWriteOff.exchangeId;
  closeModal();
  writeOffReward(exchangeId);
}

function writeOffReward(exchangeId) {
  const reward = state.exchangedRewards.find(item => item.exchangeId === exchangeId);
  if (!reward || reward.redeemedAt) return;
  reward.redeemedAt = Date.now();
  addRecord(state, `核销了「${reward.name}」`, 0, { category: 'shop' });
  showToast(`算对啦，已核销：${reward.name}`);
  persist();
  render('my');
}

function drawLottery() {
  if (!spendPoints(10)) return;
  const total = LOTTERY.reduce((sum, item) => sum + item.weight, 0);
  let pick = Math.random() * total;
  const reward = LOTTERY.find(item => (pick -= item.weight) <= 0) || LOTTERY[0];
  const time = Date.now();

  if (reward.type === 'points' && reward.points) {
    state.points += reward.points;
  } else if (reward.type === 'reward') {
    const prizeId = `lottery-${reward.name.replace(/\s+/g, '-')}`;
    state.exchangedRewards.unshift({
      id: prizeId,
      icon: reward.icon,
      name: reward.name,
      cost: 0,
      source: 'lottery',
      exchangeId: `${prizeId}-${time}`,
      time,
      redeemedAt: null
    });
  }

  addRecord(state, `积分抽奖：${reward.name}`, (reward.type === 'points' ? reward.points : 0) - 10, { category: 'shop' });

  let toastMessage = `抽到了：${reward.name}`;
  if (reward.type === 'points' && reward.points) {
    toastMessage = `${toastMessage}，立刻加 ${reward.points} 积分。`;
  } else if (reward.type === 'reward') {
    toastMessage = `${toastMessage}，已放入我的兑换。`;
  } else if (reward.type === 'boost') {
    const boostResult = applyInstantDailyPointBoost(reward.multiplier);
    toastMessage = boostResult.multiplier === 2
      ? `哇，抽到双倍卡啦！按你当前的净得分，立刻多奖励 ${boostResult.bonus} 分！`
      : `哇，抽到三倍卡啦！按你当前的净得分，立刻多奖励 ${boostResult.bonus} 分！`;
  }

  showToast(toastMessage);
  persist();
  render('shop');
}

function render(tab = state.selectedTab) {
  state.selectedTab = tab;
  persist();
  clearInterval(additionTimerId);
  appShell.classList.toggle('skip-render-animation', skipNextRenderAnimation);
  syncShellVisibility();
  renderNavigation(tab);
  renderHeaderSwitch(tab);
  app.innerHTML = (views[tab] || views.points)();
  app.querySelectorAll('[data-card-more-kind]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openCardActionMenu(trigger.closest('.literacy-card, .rule-card'), trigger);
    });
  });
  ensureAdditionTimer();
  skipNextRenderAnimation = false;
  requestAnimationFrame(() => appShell.classList.remove('skip-render-animation'));
}

function closeModal() {
  pendingWriteOff = null;
  modal.classList.add('hidden');
  modal.innerHTML = '';
}

function closeDrawer() {
  navDrawer.hidden = true;
  navBackdrop.hidden = true;
  navDrawer.classList.remove('open');
  navBackdrop.classList.remove('show');
  navTrigger?.setAttribute('aria-expanded', 'false');
}

function openDrawer() {
  navDrawer.hidden = false;
  navBackdrop.hidden = false;
  requestAnimationFrame(() => {
    navDrawer.classList.add('open');
    navBackdrop.classList.add('show');
  });
  navTrigger?.setAttribute('aria-expanded', 'true');
}

function toggleDrawer() {
  if (navDrawer.classList.contains('open')) {
    closeDrawer();
    return;
  }
  openDrawer();
}

function syncDrawerForViewport() {
  if (window.getComputedStyle(sideNav).display !== 'none') {
    closeDrawer();
  }
}

function toggleSidebar() {
  navCollapsed = !navCollapsed;
  renderNavigation(state.selectedTab);
  syncDrawerForViewport();
}

function goToTab(tab) {
  if (!isNavTab(tab)) return;
  if (tab !== 'my') state.mySection = null;
  closeDrawer();
  render(tab);
}

function jumpToTab(tab) {
  if (!isNavTab(tab) && tab !== 'my') return;
  state.mySection = null;
  closeDrawer();
  render(tab);
}

function goHome() {
  state.mySection = null;
  state.pointsSection = 'earn';
  persist();
  closeDrawer();
  render('points');
}

function openRecordsDetail() {
  state.mySection = 'records';
  persist();
  closeDrawer();
  render('my');
}

function showRevertConfirm(recordId) {
  const record = state.records.find(item => String(item.id || item.time) === String(recordId));
  if (!record) return;
  pendingRevertRecord = record;
  modal.classList.remove('hidden');
  modal.innerHTML = `<div class="modal-card"><button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button><h2>确认撤回这次操作？</h2><p>撤回后，积分会恢复到操作前。</p><div class="actions"><button class="btn danger-soft" type="button" data-revert-confirm>是，继续</button><button class="btn ghost" type="button" data-action="close-modal">取消</button></div></div>`;
}

function showRevertQuestion(errorMessage = '') {
  const challenge = createMathChallenge();
  pendingRevertRecord.questionAnswer = challenge.answer;
  modal.classList.remove('hidden');
  modal.innerHTML = `<form class="modal-card math-verify-card" data-revert-form><h2>撤回验证</h2><p class="big-copy">答对 10 以内加减法后，才可以撤回这次积分操作。</p><label class="math-question"><span>${challenge.a} ${challenge.op} ${challenge.b} = ?</span><input name="answer" type="number" inputmode="numeric" autocomplete="off" placeholder="答案" aria-label="请输入答案" required></label>${errorMessage ? `<p class="math-error">${errorMessage}</p>` : '<p class="math-hint">答错也没关系，可以继续尝试。</p>'}<div class="actions"><button class="btn secondary" type="submit">提交答案</button><button class="btn ghost" type="button" data-action="close-modal">稍后再撤回</button></div></form>`;
}

function openMy() {
  state.mySection = null;
  persist();
  closeDrawer();
  render('my');
}


function closePlanTypeMenus() {
  document.querySelectorAll('[data-plan-type-menu], [data-rule-type-menu], [data-rule-action-menu]').forEach(menu => menu.classList.add('hidden'));
  document.querySelectorAll('[data-plan-type-trigger], [data-rule-type-trigger], [data-rule-action-trigger]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
}

function showPlanModal() {
  const draftPlanType = state.planningDraftType === 'longTerm' ? 'longTerm' : 'single';
  const draftPlanTypeLabel = draftPlanType === 'longTerm' ? '长期' : '单次';
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card plan-modal" data-plan-form>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>新增学习任务</h2>
      </div>
      <div class="plan-form plan-form-modal">
        <label class="custom-rule-field"><span>内容</span><input name="title" type="text" maxlength="24" placeholder="例如：背 5 个单词" aria-label="任务名称" required></label>
        <label class="custom-rule-field"><span>积分数</span><input name="points" type="number" min="1" max="50" step="1" placeholder="请输入积分数" aria-label="任务积分" required></label>
        <label class="custom-rule-field custom-rule-select-field"><span>时效</span><div class="plan-type-select" data-plan-type>
          <input type="hidden" name="planType" value="${draftPlanType}">
          <button class="plan-type-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" data-plan-type-trigger>
            <span data-plan-type-label>${draftPlanTypeLabel}</span>
            <span class="plan-type-arrow" aria-hidden="true"></span>
          </button>
          <div class="plan-type-menu hidden" role="listbox" aria-label="时效选项" data-plan-type-menu>
            <button class="plan-type-option ${draftPlanType === 'single' ? 'is-active' : ''}" type="button" role="option" aria-selected="${draftPlanType === 'single' ? 'true' : 'false'}" data-plan-type-option="single">
              <span class="plan-type-check" aria-hidden="true">✓</span>
              <span>单次</span>
            </button>
            <button class="plan-type-option ${draftPlanType === 'longTerm' ? 'is-active' : ''}" type="button" role="option" aria-selected="${draftPlanType === 'longTerm' ? 'true' : 'false'}" data-plan-type-option="longTerm">
              <span class="plan-type-check" aria-hidden="true">✓</span>
              <span>长期</span>
            </button>
          </div>
        </div></label>
      </div>
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('input[name="title"]')?.focus(), 0);
}

function completePlan(planId, sourceTab = 'planning') {
  const plan = state.plans.find(item => item.id === planId);
  if (!plan || plan.done) return;
  const isLongTerm = plan.planType === 'longTerm';
  if (!isLongTerm) {
    plan.done = true;
    plan.completedAt = Date.now();
  }
  awardPoints(
    plan.points,
    `${plan.title}，加分 ${plan.points} 积分`,
    { category: 'study', source: 'planning' },
    `学习任务完成，加分 ${plan.points} 积分。`,
    sourceTab
  );
}


function deletePlan(planId) {
  const beforeCount = state.plans.length;
  state.plans = state.plans.filter(item => item.id !== planId);
  if (state.plans.length === beforeCount) return;
  showToast('学习任务已删除。');
  persist();
  render('planning');
}

function syncNumberBoardUi(activeNumber, activeButton) {
  const numberButtons = app.querySelectorAll('[data-number-cell]');
  numberButtons.forEach(button => {
    const buttonNumber = Number(button.dataset.numberCell);
    const isSelected = buttonNumber === activeNumber;
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.setAttribute('aria-label', `${buttonNumber}${isSelected ? '，已选中' : '，未选中'}`);
  });

  if (activeButton) {
    activeButton.classList.add('selected');
    activeButton.setAttribute('aria-pressed', 'true');
    activeButton.setAttribute('aria-label', `${activeNumber}，已选中`);
  }

  if (headerSwitch) {
    headerSwitch.innerHTML = `<div class="status-badge" aria-live="polite">${currentNumbersCountLabel()}</div>`;
    headerSwitch.hidden = false;
  }
}

function syncPinyinBoardUi(activeValue, activeButton) {
  const pinyinButtons = app.querySelectorAll('[data-pinyin-cell]');
  pinyinButtons.forEach(button => {
    const cellValue = button.dataset.pinyinCell;
    const isSelected = cellValue === activeValue;
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.setAttribute('aria-label', `${cellValue}，拼音${isSelected ? '，已选中' : '，未选中'}`);
  });

  if (activeButton) {
    activeButton.classList.add('selected');
    activeButton.setAttribute('aria-pressed', 'true');
    activeButton.setAttribute('aria-label', `${activeValue}，拼音，已选中`);
  }

  if (headerSwitch) {
    headerSwitch.innerHTML = `<div class="status-badge" aria-live="polite">${currentPinyinLabel()}</div>`;
    headerSwitch.hidden = false;
  }
}

function syncLetterBoardUi(activeValue, activeButton) {
  const letterButtons = app.querySelectorAll('[data-letter-cell]');
  letterButtons.forEach(button => {
    const cellValue = button.dataset.letterCell;
    const isSelected = cellValue === activeValue;
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    button.setAttribute('aria-label', `${cellValue}，英文字母${isSelected ? '，已选中' : '，未选中'}`);
  });

  if (activeButton) {
    activeButton.classList.add('selected');
    activeButton.setAttribute('aria-pressed', 'true');
    activeButton.setAttribute('aria-label', `${activeValue}，英文字母，已选中`);
  }

  if (headerSwitch) {
    headerSwitch.innerHTML = `<div class="status-badge" aria-live="polite">${currentLettersLabel()}</div>`;
    headerSwitch.hidden = false;
  }
}

function toggleNumberCell(value, activeButton = null) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100) return;
  state.numberBoardSelections = [number];
  persist();
  if (state.selectedTab === 'numbers') {
    syncNumberBoardUi(number, activeButton);
    return;
  }
  skipNextRenderAnimation = true;
  render('numbers');
}

function togglePinyinCell(value, activeButton = null) {
  const nextValue = String(value || '').trim();
  if (!nextValue) return;
  state.pinyinSelections = [nextValue];
  persist();
  if (state.selectedTab === 'pinyin') {
    syncPinyinBoardUi(nextValue, activeButton);
    return;
  }
  skipNextRenderAnimation = true;
  render('pinyin');
}

function toggleLetterCell(value, activeButton = null) {
  const nextValue = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]$/.test(nextValue)) return;
  state.letterSelections = [nextValue];
  persist();
  if (state.selectedTab === 'letters') {
    syncLetterBoardUi(nextValue, activeButton);
    return;
  }
  skipNextRenderAnimation = true;
  render('letters');
}

function deleteRuleCard(kind, id) {
  if (!kind || !id) return;
  if (kind === 'plan') {
    const beforeCount = state.plans.length;
    state.plans = state.plans.filter(item => item.id !== id);
    if (state.plans.length === beforeCount) return;
  } else if (kind === 'point') {
    state.hiddenPointRuleIds ||= [];
    if (state.hiddenPointRuleIds.includes(id)) return;
    state.hiddenPointRuleIds.push(id);
  } else if (kind === 'point-custom') {
    const beforeCount = state.customPointRules.length;
    state.customPointRules = state.customPointRules.filter(item => item.id !== id);
    if (state.customPointRules.length === beforeCount) return;
  } else if (kind === 'deduct') {
    state.hiddenDeductRuleIds ||= [];
    if (state.hiddenDeductRuleIds.includes(id)) return;
    state.hiddenDeductRuleIds.push(id);
  } else if (kind === 'deduct-custom') {
    const beforeCount = state.customDeductRules.length;
    state.customDeductRules = state.customDeductRules.filter(item => item.id !== id);
    if (state.customDeductRules.length === beforeCount) return;
  } else {
    return;
  }
  showToast('卡片项目已删除。');
  persist();
  render('points');
}

function editRuleCard(kind, id) {
  const isDeduct = kind === 'deduct' || kind === 'deduct-custom';
  const collection = isDeduct ? (state.customDeductRules || []) : (state.customPointRules || []);
  if (kind === 'point-custom' || kind === 'deduct-custom') {
    showCustomRuleModal(isDeduct ? 'deduct' : 'earn', '', id);
    return;
  }

  let source = null;
  if (kind === 'point') {
    const [title, points] = POINT_RULES[Number(id.replace('point-', ''))] || [];
    source = { title, points };
  } else if (kind === 'deduct') {
    const [title, points] = DEDUCT_RULES[Number(id.replace('deduct-', ''))] || [];
    source = { title, points };
  } else if (kind === 'plan') {
    source = (state.plans || []).find(plan => plan.id === id);
  }
  if (!source?.title || !Number.isFinite(Number(source.points))) return;

  const nextId = `custom-${isDeduct ? 'deduct' : 'earn'}-${Date.now()}`;
  collection.unshift({
    id: nextId,
    title: source.title,
    points: Number(source.points),
    description: source.description || '',
    planType: 'longTerm',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  if (kind === 'point') {
    state.hiddenPointRuleIds ||= [];
    state.hiddenPointRuleIds.push(id);
  } else if (kind === 'deduct') {
    state.hiddenDeductRuleIds ||= [];
    state.hiddenDeductRuleIds.push(id);
  } else if (kind === 'plan') {
    state.plans = (state.plans || []).filter(plan => plan.id !== id);
  }
  persist();
  showCustomRuleModal(isDeduct ? 'deduct' : 'earn', '', nextId);
}

/* ---------- 商城兑换项目：新增 / 编辑 / 删除 ----------
 * 交互与「加减分」卡片保持一致：
 * - 内置项目来自 data.js 的 REWARDS，改不动，所以「编辑」= 复制成一条自定义项目 + 隐藏原项目
 * - 删除内置项目只把 id 记进 hiddenRewardIds，代码不动、随时能恢复
 */

function deleteRewardCard(kind, id) {
  if (!kind || !id) return;
  if (kind === 'shop-custom') {
    const beforeCount = state.customShopRewards.length;
    state.customShopRewards = state.customShopRewards.filter(item => item.id !== id);
    if (state.customShopRewards.length === beforeCount) return;
  } else if (kind === 'shop') {
    state.hiddenRewardIds ||= [];
    if (state.hiddenRewardIds.includes(id)) return;
    state.hiddenRewardIds.push(id);
  } else {
    return;
  }
  showToast('卡片项目已删除。');
  persist();
  render('shop');
}

function editRewardCard(id) {
  const source = REWARDS.find(item => item.id === id);
  if (!source) return;
  const nextId = `custom-reward-${Date.now()}`;
  state.customShopRewards.unshift({
    id: nextId,
    name: source.name,
    cost: source.cost,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  state.hiddenRewardIds ||= [];
  state.hiddenRewardIds.push(id);
  persist();
  showShopItemModal(nextId);
}

function showShopItemModal(editId = '', errorMessage = '') {
  const editingItem = editId
    ? (state.customShopRewards || []).find(item => item.id === editId)
    : null;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card custom-rule-modal" data-shop-item-form data-shop-item-edit="${editId}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>${editId ? '编辑兑换项目' : '新增兑换项目'}</h2>
      </div>
      <label class="custom-rule-field">
        <span>名称</span>
        <input name="name" type="text" maxlength="24" autocomplete="off" value="${editingItem ? escapeHtml(editingItem.name) : ''}" placeholder="例如：去游乐场玩一次" aria-label="名称" required>
      </label>
      <label class="custom-rule-field">
        <span>所需积分</span>
        <input name="cost" type="number" min="1" max="1000" step="1" inputmode="numeric" value="${editingItem ? editingItem.cost : ''}" placeholder="请输入积分" aria-label="所需积分" required>
      </label>
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('input[name="name"]')?.focus(), 0);
}

function submitShopItemForm(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const costValue = Number(data.get('cost'));
  const cost = Math.max(1, Math.min(1000, Math.round(costValue || 0)));
  const editId = form.dataset.shopItemEdit || '';

  if (!name) {
    showShopItemModal(editId, '请先填写名称。');
    return;
  }
  if (!Number.isFinite(costValue) || costValue < 1) {
    showShopItemModal(editId, '请输入正确的积分数。');
    return;
  }

  const existingItem = editId
    ? (state.customShopRewards || []).find(item => item.id === editId)
    : null;
  const nextItem = {
    id: editId || `custom-reward-${Date.now()}`,
    name: name.slice(0, 24),
    cost,
    createdAt: existingItem?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  if (editId) {
    const index = state.customShopRewards.findIndex(item => item.id === editId);
    if (index >= 0) state.customShopRewards[index] = nextItem;
  } else {
    state.customShopRewards.unshift(nextItem);
  }
  closeModal();
  showToast(editId ? '兑换项目已更新。' : '新的兑换项目已添加。');
  persist();
  render('shop');
}

function closeRuleContextMenu() {
  ruleContextMenu.classList.add('hidden');
  activeRuleContext = null;
}

function openRuleContextMenu(card, clientX, clientY) {
  const kind = card?.dataset.ruleContextKind;
  const id = card?.dataset.ruleContextId;
  if (!kind || !id) return;
  activeRuleContext = { kind, id };
  ruleContextMenu.classList.remove('hidden');
  const gap = 10;
  const left = Math.max(gap, Math.min(clientX, window.innerWidth - ruleContextMenu.offsetWidth - gap));
  const top = Math.max(gap, Math.min(clientY, window.innerHeight - ruleContextMenu.offsetHeight - gap));
  ruleContextMenu.style.left = `${left}px`;
  ruleContextMenu.style.top = `${top}px`;
}

function closeCardActionMenu() {
  cardActionMenu.classList.add('hidden');
  activeCardAction = null;
}

function openCardActionMenu(card, trigger) {
  const kind = trigger?.dataset.cardMoreKind;
  const id = trigger?.dataset.cardMoreId;
  if (!kind || !id) return;
  if (!cardActionMenu.classList.contains('hidden')
    && activeCardAction?.kind === kind
    && activeCardAction?.id === id) {
    closeCardActionMenu();
    return;
  }
  activeCardAction = { kind, id };
  cardActionMenu.classList.remove('hidden');
  // 卡片类（加减分 / 商城兑换 / 识字 / 单词）的菜单都从右上角按钮下方展开、右对齐
  const cardKinds = ['point', 'deduct', 'point-custom', 'deduct-custom', 'plan', 'literacy', 'word', 'shop', 'shop-custom'];
  const editButton = cardActionMenu.querySelector('[data-card-action="edit"]');
  editButton.hidden = !cardKinds.includes(kind);
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const isPointsCard = cardKinds.includes(kind);
  const preferredLeft = isPointsCard ? rect.left - cardActionMenu.offsetWidth + rect.width : rect.right - cardActionMenu.offsetWidth;
  const left = Math.max(gap, Math.min(preferredLeft, window.innerWidth - cardActionMenu.offsetWidth - gap));
  const preferredTop = isPointsCard ? rect.bottom + gap : rect.top - cardActionMenu.offsetHeight - gap;
  const top = isPointsCard
    ? Math.min(preferredTop, window.innerHeight - cardActionMenu.offsetHeight - gap)
    : (preferredTop >= gap ? preferredTop : Math.min(rect.bottom + gap, window.innerHeight - cardActionMenu.offsetHeight - gap));
  cardActionMenu.style.left = `${left}px`;
  cardActionMenu.style.top = `${Math.max(gap, top)}px`;
}

function getRuleCardFromEvent(event) {
  const card = event.target.closest?.('.rule-card, .reward-card');
  if (!card || card.classList.contains('rule-card-add')) return null;
  // 长按 = 打开「更多」菜单，卡片上得真有更多按钮才算数
  return card.querySelector('[data-card-more-kind]') ? card : null;
}

function cancelRuleLongPress() {
  if (ruleLongPressTimer) window.clearTimeout(ruleLongPressTimer);
  ruleLongPressTimer = null;
  ruleLongPressStart = null;
}

app.addEventListener('touchstart', event => {
  if (event.touches.length !== 1) return cancelRuleLongPress();
  const card = getRuleCardFromEvent(event);
  if (!card || event.target.closest('button')) return cancelRuleLongPress();
  const [touch] = event.touches;
  ruleLongPressStart = { card, clientX: touch.clientX, clientY: touch.clientY };
  ruleLongPressTimer = window.setTimeout(() => {
    if (!ruleLongPressStart) return;
    const { card: activeCard, clientX, clientY } = ruleLongPressStart;
    suppressRuleCardClickUntil = Date.now() + 700;
    const trigger = activeCard.querySelector('[data-card-more-kind]');
    if (trigger) openCardActionMenu(activeCard, trigger);
    else openRuleContextMenu(activeCard, clientX, clientY);
    cancelRuleLongPress();
  }, 500);
}, { passive: true });

app.addEventListener('touchmove', event => {
  if (!ruleLongPressStart || event.touches.length !== 1) return cancelRuleLongPress();
  const [touch] = event.touches;
  if (Math.hypot(touch.clientX - ruleLongPressStart.clientX, touch.clientY - ruleLongPressStart.clientY) > 10) {
    cancelRuleLongPress();
    closeCardActionMenu();
    closeRuleContextMenu();
  }
}, { passive: true });
app.addEventListener('touchend', cancelRuleLongPress, { passive: true });
app.addEventListener('touchcancel', cancelRuleLongPress, { passive: true });

// Both the page and inner scroll containers can scroll on touch devices.
// Close floating card menus as soon as scrolling starts so they never cover
// content after the user moves to another part of the list.
document.addEventListener('scroll', () => {
  closeCardActionMenu();
  closeRuleContextMenu();
}, { passive: true, capture: true });

app.addEventListener('contextmenu', event => {
  const card = getRuleCardFromEvent(event);
  if (!card) return;
  event.preventDefault();
  const trigger = card.querySelector('[data-card-more-kind]');
  if (trigger) openCardActionMenu(card, trigger);
  else openRuleContextMenu(card, event.clientX, event.clientY);
});

ruleContextMenu.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-rule-context-delete]');
  if (!deleteButton || !activeRuleContext) return;
  const { kind, id } = activeRuleContext;
  closeRuleContextMenu();
  deleteRuleCard(kind, id);
});

cardActionMenu.addEventListener('click', event => {
  const actionButton = event.target.closest('[data-card-action]');
  if (!actionButton || !activeCardAction) return;
  const { kind, id } = activeCardAction;
  const action = actionButton.dataset.cardAction;
  closeCardActionMenu();
  if (action === 'edit') {
    if (kind === 'literacy') showLiteracyModal(id);
    if (kind === 'word') showWordModal(id);
    if (kind === 'point-custom') showCustomRuleModal('earn', '', id);
    if (kind === 'deduct-custom') showCustomRuleModal('deduct', '', id);
    if (kind === 'point' || kind === 'deduct' || kind === 'plan') editRuleCard(kind, id);
    if (kind === 'shop-custom') showShopItemModal(id);
    if (kind === 'shop') editRewardCard(id);
    return;
  }
  if (action === 'delete') {
    if (kind === 'literacy') deleteLiteracyItem(id);
    if (kind === 'word') deleteWordItem(id);
    if (kind === 'point-custom' || kind === 'deduct-custom' || kind === 'point' || kind === 'deduct' || kind === 'plan') deleteRuleCard(kind, id);
    if (kind === 'shop-custom' || kind === 'shop') deleteRewardCard(kind, id);
  }
});

function addPlan(form) {
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const points = Math.max(1, Math.min(50, Math.round(Number(data.get('points')) || 5)));
  const planType = data.get('planType') === 'longTerm' ? 'longTerm' : 'single';
  if (!title) return;
  state.plans.unshift({
    id: `plan-${Date.now()}`,
    title,
    points,
    category: 'study',
    planType,
    done: false,
    createdAt: Date.now(),
    completedAt: null
  });
  state.planningDraftType = 'single';
  closeModal();
  showToast(planType === 'longTerm' ? '长期任务已添加到积分-加分。' : '单次任务已添加到任务中。');
  persist();
  render(planType === 'longTerm' ? 'points' : 'planning');
}

const actions = {
  lottery: drawLottery,
  home: goHome,
  'open-records': openRecordsDetail,
  'open-my': openMy,
  'toggle-sidebar': toggleSidebar,
  'toggle-drawer': toggleDrawer,
  'close-drawer': closeDrawer,
  'close-modal': closeModal,
  'my-back': () => {
    state.mySection = null;
    persist();
    render('my');
  },
  reset: () => {
    state = resetState();
    persist();
    showToast('Demo 已重置');
    render('my');
  },
  export: () => {
    exportData();
  },
  import: () => {
    openImportPicker();
  },
  'cloud-sync': async () => {
    if (cloudStatus().mode !== 'ready') {
      showToast('请先登录同步账号');
      return;
    }
    setCloudBusy(true);
    // 用户主动点的同步：这一路才显示「同步中…」，后台自动同步一律静默
    await cloudSync();
    setCloudBusy(false);
    renderCloudSection();
    const now = cloudStatus();
    showToast(now.error ? '同步失败了，稍后会自动重试' : '已同步到云端');
  },
  'cloud-signout': () => {
    showCloudSignOutConfirm();
  },
  // 退出登录：本机数据保留，云端数据不动，回到登录界面可以换邮箱
  'cloud-signout-confirm': async () => {
    closeModal();
    await cloudSignOut();
    cloudUi = { mode: 'password', busy: false };
    renderCloudSection();
    showToast('已退出同步账号，本机数据保留');
  }
};

importInput.addEventListener('change', async event => {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    await importDataFromFile(file);
    showToast('导入成功，已恢复数据');
  } catch (error) {
    const message = error?.message === 'unsupported-backup-version'
      ? '备份文件版本暂不支持'
      : '导入失败，请选择正确的备份文件';
    showToast(message);
  } finally {
    importInput.value = '';
  }
});

pointsPill.addEventListener('click', event => {
  event.stopPropagation();
  openRecordsDetail();
});

document.addEventListener('click', event => {
  const revertButton = event.target.closest?.('[data-revert-record]');
  if (revertButton) { showRevertConfirm(revertButton.dataset.revertRecord); return; }
  if (event.target.closest?.('[data-revert-confirm]')) { showRevertQuestion(); return; }
  const sortToggle = event.target.closest?.('[data-sort-toggle]');
  if (sortToggle) {
    const menu = sortToggle.parentElement?.querySelector('[data-sort-menu]');
    menu?.classList.toggle('hidden');
    sortToggle.setAttribute('aria-expanded', menu?.classList.contains('hidden') ? 'false' : 'true');
    return;
  }
  if (!event.target.closest?.('.points-sort-control')) closePointsSortMenu();
  const sortOption = event.target.closest?.('[data-points-sort]');
  if (sortOption) {
    state.pointsSort = sortOption.dataset.pointsSort;
    persist();
    render('points');
    return;
  }
  const cardMoreTrigger = event.target.closest?.('[data-card-more-kind]');
  if (cardMoreTrigger) {
    openCardActionMenu(cardMoreTrigger.closest('.literacy-card, .rule-card'), cardMoreTrigger);
    return;
  }
  if (!event.target.closest('#ruleContextMenu')) closeRuleContextMenu();
  if (!event.target.closest('#cardActionMenu')) closeCardActionMenu();
  if (Date.now() < suppressRuleCardClickUntil && getRuleCardFromEvent(event)) return;
  if (event.target === modal && !modal.classList.contains('hidden')) {
    closeModal();
    return;
  }
  if (event.target === navBackdrop && navDrawer.classList.contains('open')) {
    closeDrawer();
    return;
  }

  if (!event.target.closest('[data-plan-type], [data-rule-type]')) {
    closePlanTypeMenus();
  }

  const speakTarget = event.target.closest('[data-speak]');
  if (speakTarget && !event.target.closest('button')) speakToast(speakTarget.dataset.speak);

  const literacyCard = event.target.closest('[data-literacy-preview]');
  if (literacyCard && !event.target.closest('button')) {
    showLiteracyPreviewModal(literacyCard.dataset.literacyPreview);
    return;
  }

  const wordCard = event.target.closest('[data-word-preview]');
  if (wordCard && !event.target.closest('button')) {
    showWordPreviewModal(wordCard.dataset.wordPreview);
    return;
  }

  const target = event.target.closest('button');
  if (!target) return;

  if (target.dataset.ruleActionOption) {
    const root = target.closest('[data-rule-action]');
    const hiddenInput = root?.querySelector('input[name="ruleAction"]');
    const label = root?.querySelector('[data-rule-action-label]');
    const nextValue = target.dataset.ruleActionOption;
    if (hiddenInput) hiddenInput.value = nextValue;
    if (label) label.textContent = nextValue === 'deduct' ? '减分' : '加分';
    root?.querySelectorAll('[data-rule-action-option]').forEach(option => {
      const active = option.dataset.ruleActionOption === nextValue;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    return;
  }

  if (target.dataset.planTypeTrigger !== undefined) {
    const root = target.closest('[data-plan-type]');
    const menu = root?.querySelector('[data-plan-type-menu]');
    const willOpen = menu?.classList.contains('hidden');
    closePlanTypeMenus();
    if (menu && willOpen) {
      menu.classList.remove('hidden');
      target.setAttribute('aria-expanded', 'true');
    }
    return;
  }

  if (target.dataset.ruleTypeTrigger !== undefined) {
    const root = target.closest('[data-rule-type]');
    const menu = root?.querySelector('[data-rule-type-menu]');
    const willOpen = menu?.classList.contains('hidden');
    closePlanTypeMenus();
    if (menu && willOpen) {
      menu.classList.remove('hidden');
      target.setAttribute('aria-expanded', 'true');
    }
    return;
  }

  if (target.dataset.ruleActionTrigger !== undefined) {
    const root = target.closest('[data-rule-action]');
    const menu = root?.querySelector('[data-rule-action-menu]');
    const willOpen = menu?.classList.contains('hidden');
    closePlanTypeMenus();
    if (menu && willOpen) {
      menu.classList.remove('hidden');
      target.setAttribute('aria-expanded', 'true');
    }
    return;
  }

  if (target.dataset.planTypeOption) {
    const root = target.closest('[data-plan-type]');
    const hiddenInput = root?.querySelector('input[name="planType"]');
    const label = root?.querySelector('[data-plan-type-label]');
    const nextValue = target.dataset.planTypeOption;
    if (hiddenInput) hiddenInput.value = nextValue;
    if (label) label.textContent = nextValue === 'longTerm' ? '长期' : '单次';
    root?.querySelectorAll('[data-plan-type-option]').forEach(option => {
      const active = option.dataset.planTypeOption === nextValue;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    state.planningDraftType = nextValue;
    persist();
    closePlanTypeMenus();
    return;
  }

  if (target.dataset.ruleTypeOption) {
    const root = target.closest('[data-rule-type]');
    const hiddenInput = root?.querySelector('input[name="planType"]');
    const label = root?.querySelector('[data-rule-type-label]');
    const nextValue = target.dataset.ruleTypeOption;
    if (hiddenInput) hiddenInput.value = nextValue;
    if (label) label.textContent = nextValue === 'longTerm' ? '长期' : '单次';
    root?.querySelectorAll('[data-rule-type-option]').forEach(option => {
      const active = option.dataset.ruleTypeOption === nextValue;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    state.customRuleDraftType = nextValue;
    persist();
    closePlanTypeMenus();
    return;
  }


  if (target.dataset.tab) goToTab(target.dataset.tab);
  if (target.dataset.tabJump) jumpToTab(target.dataset.tabJump);
  if (target.dataset.pointsSection) {
    state.pointsSection = target.dataset.pointsSection;
    persist();
    render('points');
  }
  if (target.dataset.shopSection) {
    state.shopSection = target.dataset.shopSection;
    persist();
    render('shop');
  }
  if (target.dataset.planningSection) {
    state.planningSection = target.dataset.planningSection;
    persist();
    render('planning');
  }
  if (target.dataset.openPlanModal !== undefined) {
    showPlanModal();
    return;
  }
  if (target.dataset.literacyCreate !== undefined) showCreateLiteracyModal();
  if (target.dataset.literacyDelete) deleteLiteracyItem(target.dataset.literacyDelete);
  if (target.dataset.literacyPreviewMove) moveLiteracyPreview(target.dataset.literacyPreviewId, target.dataset.literacyPreviewMove);
  if (target.dataset.literacyPreview) showLiteracyPreviewModal(target.dataset.literacyPreview);
  if (target.dataset.literacyEdit) showLiteracyModal(target.dataset.literacyEdit);
  if (target.dataset.cardMoreKind) {
    openCardActionMenu(target.closest('.literacy-card, .rule-card'), target);
    return;
  }
  if (target.dataset.wordCreate !== undefined) showCreateWordModal();
  if (target.dataset.wordDelete) deleteWordItem(target.dataset.wordDelete);
  if (target.dataset.wordPreviewMove) moveWordPreview(target.dataset.wordPreviewId, target.dataset.wordPreviewMove);
  if (target.dataset.wordPreview) showWordPreviewModal(target.dataset.wordPreview);
  if (target.dataset.wordEdit) showWordModal(target.dataset.wordEdit);
  if (target.dataset.literacyColor) {
    const form = target.closest('form');
    form?.querySelectorAll('[data-literacy-color]').forEach(option => {
      const active = option.dataset.literacyColor === target.dataset.literacyColor;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const colorInput = form?.querySelector('input[name="color"]');
    if (colorInput) colorInput.value = target.dataset.literacyColor;
    return;
  }
  if (target.dataset.numberCell) {
    toggleNumberCell(target.dataset.numberCell, target);
    return;
  }
  if (target.dataset.additionMode) {
    startAdditionGame(target.dataset.additionMode);
    return;
  }
  if (target.dataset.additionOption) {
    answerAdditionQuestion(target.dataset.additionOption);
    return;
  }
  if (target.dataset.additionRestart) {
    startAdditionGame(target.dataset.additionRestart);
    return;
  }
  if (target.dataset.additionReset !== undefined) {
    resetAdditionGame();
    return;
  }
  if (target.dataset.pinyinCell) {
    togglePinyinCell(target.dataset.pinyinCell, target);
    return;
  }
  if (target.dataset.letterCell) {
    toggleLetterCell(target.dataset.letterCell, target);
    return;
  }
  if (target.dataset.earn) earnPoints(Number(target.dataset.earn));
  if (target.dataset.earnCustom) earnCustomPoints(target.dataset.earnCustom);
  if (target.dataset.deduct) deductPoints(Number(target.dataset.deduct));
  if (target.dataset.deductCustom) deductCustomPoints(target.dataset.deductCustom);
  if (target.dataset.openCustomRule) showCustomRuleModal(target.dataset.openCustomRule);
  if (target.dataset.openShopItem !== undefined) showShopItemModal();
  if (target.dataset.exchange) exchangeReward(target.dataset.exchange);
  if (target.dataset.deleteRuleKind) deleteRuleCard(target.dataset.deleteRuleKind, target.dataset.deleteRuleId);
  if (target.dataset.completePlan) completePlan(target.dataset.completePlan);
  if (target.dataset.completePlanEarn) completePlan(target.dataset.completePlanEarn, 'points');
  if (target.dataset.deletePlan) deletePlan(target.dataset.deletePlan);
  if (target.dataset.writeOff) requestWriteOffVerification(target.dataset.writeOff);
  if (target.dataset.mySection) {
    state.mySection = target.dataset.mySection;
    persist();
    render('my');
  }
  if (target.dataset.cloudMode) {
    setCloudMode(target.dataset.cloudMode);
    return;
  }
  if (target.dataset.cloudSend) {
    const form = target.closest('form');
    if (form) void sendCloudCode(form, target.dataset.cloudSend);
    return;
  }
  const action = actions[target.dataset.action];
  if (action) {
    Promise.resolve(action()).catch(error => {
      console.error('Action failed:', error);
      showToast('操作失败，请稍后再试。');
    });
  }
});

document.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') closePointsSortMenu();
}, { passive: true });

document.addEventListener('touchmove', closePointsSortMenu, { passive: true });
window.addEventListener('scroll', closePointsSortMenu, { passive: true });

document.addEventListener('submit', event => {
  if (event.target.matches('[data-cloud-form]')) {
    event.preventDefault();
    void submitCloudForm(event.target);
    return;
  }
  if (event.target.matches('[data-revert-form]')) {
    event.preventDefault();
    const answer = Number(new FormData(event.target).get('answer'));
    if (answer !== pendingRevertRecord?.questionAnswer) {
      showRevertQuestion('答案不对，再试一次。');
      return;
    }
    const index = state.records.indexOf(pendingRevertRecord);
    if (index >= 0) {
      state.points -= pendingRevertRecord.delta || 0;
      // 告诉同步层这次是撤回：云端会记一条互相抵消的流水，两台设备的明细都能对上
      markRevertOp(pendingRevertRecord.id);
      state.records.splice(index, 1);
      pendingRevertRecord = null;
      closeModal();
      persist();
      render('my');
      showToast('操作已撤回，积分已回滚。');
    }
    return;
  }
  if (event.target.matches('[data-plan-form]')) {
    event.preventDefault();
    addPlan(event.target);
    return;
  }
  if (event.target.matches('[data-custom-rule-form]')) {
    event.preventDefault();
    submitCustomRuleForm(event.target);
    return;
  }
  if (event.target.matches('[data-shop-item-form]')) {
    event.preventDefault();
    submitShopItemForm(event.target);
    return;
  }
  if (event.target.matches('[data-literacy-create-form]')) {
    event.preventDefault();
    addLiteracyItem(event.target);
    return;
  }
  if (event.target.matches('[data-literacy-edit-form]')) {
    event.preventDefault();
    submitLiteracyEdit(event.target);
    return;
  }
  if (event.target.matches('[data-word-create-form]')) {
    event.preventDefault();
    addWordItem(event.target);
    return;
  }
  if (event.target.matches('[data-word-edit-form]')) {
    event.preventDefault();
    submitWordEdit(event.target);
    return;
  }
  if (!event.target.matches('[data-write-off-form]')) return;
  event.preventDefault();
  submitWriteOffVerification();
});

document.addEventListener('keydown', event => {
  if (!modal.classList.contains('hidden') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    const previewModal = modal.querySelector('[data-literacy-preview-active]');
    if (previewModal) {
      event.preventDefault();
      moveLiteracyPreview(previewModal.dataset.literacyPreviewActive, event.key === 'ArrowLeft' ? 'prev' : 'next');
      return;
    }
    const wordPreviewModal = modal.querySelector('[data-word-preview-active]');
    if (wordPreviewModal) {
      event.preventDefault();
      moveWordPreview(wordPreviewModal.dataset.wordPreviewActive, event.key === 'ArrowLeft' ? 'prev' : 'next');
      return;
    }
  }
  const literacyCard = event.target.closest('[data-literacy-preview]');
  if (literacyCard && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    showLiteracyPreviewModal(literacyCard.dataset.literacyPreview);
    return;
  }
  const wordCard = event.target.closest('[data-word-preview]');
  if (wordCard && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    showWordPreviewModal(wordCard.dataset.wordPreview);
    return;
  }
  if (event.key === 'Escape' && navDrawer.classList.contains('open')) {
    closeDrawer();
    return;
  }
  const target = event.target.closest('[data-speak]');
  if (!target || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  speakToast(target.dataset.speak);
});

window.addEventListener('resize', syncDrawerForViewport);
window.addEventListener('resize', closeRuleContextMenu);

modal.addEventListener('touchstart', event => {
  const previewModal = event.target.closest('[data-literacy-preview-active], [data-word-preview-active]');
  if (!previewModal || event.touches.length !== 1) {
    literacyPreviewTouch = null;
    return;
  }
  const [touch] = event.touches;
  literacyPreviewTouch = {
    clientX: touch.clientX,
    clientY: touch.clientY
  };
}, { passive: true });

modal.addEventListener('touchend', event => {
  if (!literacyPreviewTouch) return;
  const [touch] = event.changedTouches || [];
  if (!touch) {
    literacyPreviewTouch = null;
    return;
  }
  const previewModal = modal.querySelector('[data-literacy-preview-active], [data-word-preview-active]');
  if (previewModal?.dataset.wordPreviewActive) {
    const deltaX = touch.clientX - literacyPreviewTouch.clientX;
    const deltaY = touch.clientY - literacyPreviewTouch.clientY;
    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
      moveWordPreview(previewModal.dataset.wordPreviewActive, deltaX > 0 ? 'prev' : 'next');
    }
  } else {
    handleLiteracyPreviewSwipe(literacyPreviewTouch, touch);
  }
  literacyPreviewTouch = null;
}, { passive: true });

  pointsText.textContent = formatPoints(state.points);
pointsPill.classList.toggle('negative', state.points < 0);
syncShellVisibility();
render(state.selectedTab || 'points');
syncDrawerForViewport();

/* ---------- 启动云端同步（可选能力，失败不影响本地使用） ---------- */

/* ---------- 同步状态的就地更新 ---------- */
//
// 同步状态变化非常频繁（后台每隔几分钟自动同步一次）。
// 以前的做法是整段重绘「账号与同步」，界面会跟着闪；
// 现在只在原地替换文字节点，页面结构不动，后台同步对用户完全无感，
// 只有出错时状态行才变成红字提示。

function patchCloudDetailStatus(status) {
  const host = app.querySelector('.cloud-detail-host');
  if (!host) return false;
  // 未登录 / 未就绪等状态的结构不一样，就地更新对不上，交回整段重绘
  if (host.dataset.cloudMode !== status.mode || status.mode !== 'ready') return false;

  const summary = host.querySelector('[data-cloud-live="summary"]');
  const stateNode = host.querySelector('[data-cloud-live="state"]');
  if (!summary || !stateNode) return false;

  summary.textContent = cloudStatusText(status);
  stateNode.textContent = cloudStateText(status);
  stateNode.dataset.cloudState = status.error ? 'error' : 'ok';

  const emailNode = host.querySelector('[data-cloud-live="email"]');
  if (emailNode && status.email) emailNode.textContent = status.email;

  // 按钮只在用户主动点的同步过程中变化
  const button = host.querySelector('[data-action="cloud-sync"]');
  if (button) {
    const busy = Boolean(cloudUi?.busy) || cloudIsBusy(status);
    button.disabled = busy;
    const label = button.querySelector('[data-cloud-live="sync-btn"]');
    if (label) label.textContent = busy ? '同步中…' : '立即同步';
  }
  return true;
}

function patchCloudOverviewMeta(status) {
  const node = app.querySelector('[data-cloud-live="overview-cloud-meta"]');
  if (!node) return;
  node.textContent = cloudOverviewMetaText(status);
}

cloudAttachHost({
  getState: () => state,
  applyState: merged => {
    // 云端回来的内容里不含界面状态（那是每台设备自己的事），
    // 合进来之前先把本机正在看的页面记下来，避免同步完跳页。
    const view = pickViewState(state);
    // 从云端合并回来的积分不是本机新挣的，先打基线再落盘，避免被记成一条新流水
    markPointsBaseline(merged.points);
    state = { ...merged, ...view };
    persist();
    render(state.selectedTab || 'points');
  }
});

cloudOnChange(status => {
  if (state.mySection === 'cloud') {
    if (!patchCloudDetailStatus(status)) renderCloudSection({ keepInputs: true });
    return;
  }
  patchCloudOverviewMeta(status);
});

void cloudInit();
