import { ADDITION_MODES, DEDUCT_RULES, LOTTERY, PETS, POINT_RULES, REWARDS } from './data.js?v=20260602f';
import { SIDEBAR_ICONS } from './icons.js?v=20260601p';
import { addRecord, buildBackupPayload, importPersistedState, loadState, resetState, saveState, spend } from './store.js?v=20260602e';
import { additionView, calendarView, lettersView, literacyView, myView, numbersView, planningView, pointsView, pinyinView, sectionSwitch, shopView, wordsView } from './views.js?v=20260603b';

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
  my: () => myView(state)
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
  { value: 'planning', label: '任务', ...SIDEBAR_ICONS.planning },
  { value: 'calendar', label: '日历', ...SIDEBAR_ICONS.calendar },
  { value: 'shop', label: '商城', ...SIDEBAR_ICONS.shop }
];

const DRAWER_EXTRA_ITEMS = [
  { action: 'open-my', label: '我的', ...SIDEBAR_ICONS.my }
];

const NAV_TABS = NAV_ITEMS.map(item => item.value);

function isNavTab(tab) {
  return NAV_TABS.includes(tab);
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
  navDrawerMenu.innerHTML = `${renderNavMenu(activeTab, 'drawer')}${DRAWER_EXTRA_ITEMS.map(actionButton).join('')}`;
}

function syncShellVisibility() {
  appShell.classList.remove('logged-out');
  topbar.hidden = false;
  sideNav.hidden = false;
}

function normalizeUiState() {
  if (!isNavTab(state.selectedTab)) {
    state.selectedTab = 'points';
  }
}

function persist() {
  normalizeUiState();
  saveState(state);
  pointsText.textContent = state.points;
  pointsPill.classList.toggle('negative', state.points < 0);
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

function renderHeaderSwitch(tab) {
  const switchers = {
    points: sectionSwitch([
      { value: 'earn', label: '加分' },
      { value: 'deduct', label: '减分' }
    ], state.pointsSection || 'earn', 'points-section', 'section-switch--header'),
    shop: sectionSwitch([
      { value: 'exchange', label: '积分兑换' },
      { value: 'lottery', label: '积分抽奖' }
    ], state.shopSection || 'exchange', 'shop-section', 'section-switch--header'),
    planning: sectionSwitch([
      { value: 'active', label: '任务中' },
      { value: 'done', label: '已完成' }
    ], state.planningSection || 'active', 'planning-section', 'section-switch--header'),
    calendar: `<div class="calendar-month-badge" aria-live="polite">${currentCalendarMonthLabel()}</div>`,
    literacy: `<div class="status-badge" aria-live="polite">${currentLiteracyCountLabel()}</div>`,
    numbers: `<div class="status-badge" aria-live="polite">${currentNumbersCountLabel()}</div>`,
    addition: `<div class="status-badge" aria-live="polite">${currentAdditionLabel()}</div>`,
    pinyin: `<div class="status-badge" aria-live="polite">${currentPinyinLabel()}</div>`,
    letters: `<div class="status-badge" aria-live="polite">${currentLettersLabel()}</div>`,
    words: `<div class="status-badge" aria-live="polite">${currentWordsLabel()}</div>`
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

function selectPreviewPet(type) {
  if (!PETS[type]) return;
  state.previewPet = type;
  persist();
  render(state.selectedTab);
}

function petDetailMetrics(info, type) {
  const currentPet = state.pet?.type === type ? state.pet : null;
  const health = currentPet ? currentPet.energy : info.baseHealth;
  const happiness = currentPet
    ? Math.min(100, Math.round(76 + currentPet.energy / 5 + currentPet.level * 4))
    : info.baseHappiness;

  return { currentPet, health, happiness };
}

function showPetDetailModal(type) {
  const info = PETS[type];
  if (!info) return;

  const collectedPets = new Set([...(state.collectedPets || []), ...(state.pet?.type ? [state.pet.type] : [])]);
  const isCollected = collectedPets.has(type);
  const { currentPet, health, happiness } = petDetailMetrics(info, type);
  const statusText = currentPet
    ? `正在云宠物里 · Lv.${currentPet.level}`
    : `${isCollected ? '已收集' : '未收集'} · 领养需要 ${info.adoptCost} 积分`;

  state.previewPet = type;
  persist();
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-card pet-detail-sheet">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="pet-detail-hero ${isCollected ? 'is-collected' : 'is-uncollected'}">
        <span class="collection-badge">${isCollected ? '已收集' : '未收集'}</span>
        <img src="${info.image}" alt="${info.name}" />
      </div>
      <div class="pet-detail-copy">
        <span class="panel-kicker">宠物详情</span>
        <h2>${info.name}${info.featured ? ' ⭐镇馆之宝' : ''}</h2>
        <p class="big-copy">${info.intro}</p>
        <p class="pet-state-line">${statusText}</p>
      </div>
      <div class="pet-detail-stats" aria-label="宠物状态">
        <div><strong>${info.attack}</strong><span>攻击</span></div>
        <div><strong>${info.defense}</strong><span>防御</span></div>
        <div><strong>${info.speed}</strong><span>速度</span></div>
        <div><strong>${health}%</strong><span>健康值</span></div>
        <div><strong>${happiness}%</strong><span>幸福感</span></div>
        <div><strong>${info.reviveCost}</strong><span>复活积分</span></div>
      </div>
    </div>`;
}

function syncPetTime() {
  if (!state.pet || state.pet.status === 'planet') return;
  const now = Date.now();
  const hours = Math.floor((now - state.pet.lastFedAt) / 36e5);
  const energyLoss = Math.floor(hours / 12) * 10;
  const newEnergy = Math.max(0, 80 - energyLoss + state.pet.energyBoost);
  state.pet.energy = Math.min(100, newEnergy);
  if (hours >= 72) {
    state.pet.status = 'planet';
    addRecord(state, `${state.pet.name}因为太久没来，已经去宠物星球了`, 0);
    setTimeout(() => showPlanetModal(), 200);
  }
}

function levelFromGrowth(growth) {
  const levels = [0, 50, 120, 250, 450, 700];
  let level = 0;
  levels.forEach((need, index) => { if (growth >= need) level = index; });
  return level;
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
  addRecord(state, `今日净积分${multiplier}倍卡生效，立刻奖励 ${bonus} 积分`, bonus, {
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

function adoptPet(type) {
  const info = PETS[type];
  if (state.pet && state.pet.status !== 'planet') {
    showToast('你已经有宠物伙伴啦，先好好照顾它吧。');
    return;
  }
  if (!spendPoints(info.adoptCost)) return;
  state.pet = {
    ...info,
    level: 0,
    growth: 0,
    energy: 80,
    energyBoost: 0,
    status: 'alive',
    adoptedAt: Date.now(),
    lastFedAt: Date.now(),
    lastPlayedAt: Date.now()
  };
  state.collectedPets ||= [];
  if (!state.collectedPets.includes(type)) state.collectedPets.push(type);
  state.previewPet = type;
  state.petSection = 'cloud';
  addRecord(state, `领养了${info.name}`, -info.adoptCost, { category: 'pet' });
  showToast(`恭喜你领养了${info.name}！`);
  closeModal();
  persist();
  state.mySection = 'pet';
  render('my');
}

function feedPet() {
  if (!state.pet) return showToast('先去领养一个宠物伙伴吧。');
  if (state.pet.status === 'planet') return showPlanetModal();
  if (state.pet.energy >= 100) return showToast('它已经吃饱啦，晚点再来看看吧。');
  if (!spendPoints(10)) return;
  state.pet.energyBoost += 20;
  state.pet.energy = Math.min(100, state.pet.energy + 20);
  state.pet.growth += 10;
  state.pet.level = levelFromGrowth(state.pet.growth);
  state.pet.lastFedAt = Date.now();
  addRecord(state, `喂养了${state.pet.name}，能量 +20`, -10, { category: 'pet' });
  showToast(`喂养成功，${state.pet.name}能量 +20！`);
  persist();
  render(state.selectedTab);
}

function playPet() {
  if (!state.pet) return showToast('先去领养一个宠物伙伴吧。');
  if (state.pet.status === 'planet') return showPlanetModal();
  if (!spendPoints(8)) return;
  state.pet.energyBoost += 6;
  state.pet.energy = Math.min(100, state.pet.energy + 6);
  state.pet.growth += 8;
  state.pet.level = levelFromGrowth(state.pet.growth);
  state.pet.lastPlayedAt = Date.now();
  addRecord(state, `陪${state.pet.name}玩耍，成长值 +8`, -8, { category: 'pet' });
  showToast('你们玩得很开心，宠物心情变好啦！');
  persist();
  render(state.selectedTab);
}

function restPet() {
  if (!state.pet) return showToast('先去领养一个宠物伙伴吧。');
  if (state.pet.status === 'planet') return showPlanetModal();
  if (!spendPoints(5)) return;
  state.pet.energyBoost += 12;
  state.pet.energy = Math.min(100, state.pet.energy + 12);
  state.pet.growth += 5;
  state.pet.level = levelFromGrowth(state.pet.growth);
  addRecord(state, `陪${state.pet.name}好好睡觉，能量 +12`, -5, { category: 'pet' });
  showToast(`${state.pet.name}睡了一个好觉，精神回来啦。`);
  persist();
  render(state.selectedTab);
}

function revivePet() {
  if (!state.pet || state.pet.status !== 'planet') return;
  if (!spendPoints(state.pet.reviveCost, '复活积分还不够，先去完成任务吧。')) return;
  state.pet.level = 0;
  state.pet.growth = 0;
  state.pet.energy = 60;
  state.pet.energyBoost = 0;
  state.pet.status = 'alive';
  state.pet.lastFedAt = Date.now();
  state.pet.lastPlayedAt = Date.now();
  addRecord(state, `复活了${state.pet.name}，从 Lv.0 重新开始`, -state.pet.reviveCost, { category: 'pet' });
  closeModal();
  showToast(`${state.pet.name}回来了，要重新开始成长啦。`);
  persist();
  state.mySection = 'pet';
  render('my');
}

function earnPoints(ruleIndex) {
  const [name, points, , category = 'points'] = POINT_RULES[ruleIndex];
  awardPoints(
    points,
    `${name}，加分 ${points} 积分`,
    { category, source: 'points-rule' },
    `太棒了！加分 ${points} 积分。`,
    'points'
  );
}

function deductPoints(ruleIndex) {
  const [name, points] = DEDUCT_RULES[ruleIndex];
  state.points -= points;
  addRecord(state, `${name}，减分 ${points} 积分`, -points, { category: 'deduct' });
  showToast(`已减分 ${points} 积分。`);
  persist();
  render('points');
}

function earnCustomPoints(ruleId) {
  const rule = (state.customPointRules || []).find(item => item.id === ruleId);
  if (!rule) return;
  awardPoints(
    rule.points,
    `${rule.title}，加分 ${rule.points} 积分`,
    { category: 'points', source: 'custom-points-rule' },
    `太棒了！加分 ${rule.points} 积分。`,
    'points'
  );
}

function deductCustomPoints(ruleId) {
  const rule = (state.customDeductRules || []).find(item => item.id === ruleId);
  if (!rule) return;
  state.points -= rule.points;
  addRecord(state, `${rule.title}，减分 ${rule.points} 积分`, -rule.points, { category: 'deduct', source: 'custom-deduct-rule' });
  showToast(`已减分 ${rule.points} 积分。`);
  persist();
  render('points');
}

function showCustomRuleModal(ruleType, errorMessage = '') {
  const isDeduct = ruleType === 'deduct';
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <form class="modal-card custom-rule-modal" data-custom-rule-form="${ruleType}">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
      <div class="custom-rule-head">
        <h2>${isDeduct ? '新增减分项目' : '新增加分项目'}</h2>
      </div>
      <label class="custom-rule-field">
        <span>内容</span>
        <input name="title" type="text" maxlength="24" autocomplete="off" placeholder="${isDeduct ? '例如：顶嘴' : '例如：主动整理书包'}" aria-label="内容" required>
      </label>
      <label class="custom-rule-field">
        <span>积分数</span>
        <input name="points" type="number" min="1" max="99" inputmode="numeric" placeholder="请输入积分数" aria-label="积分数" required>
      </label>
      ${errorMessage ? `<p class="math-error">${errorMessage}</p>` : ''}
      <div class="actions">
        <button class="btn secondary" type="submit">提交</button>
        <button class="btn ghost" type="button" data-action="close-modal">取消</button>
      </div>
    </form>`;
  setTimeout(() => modal.querySelector('input[name="title"]')?.focus(), 0);
}

function submitCustomRuleForm(form) {
  const ruleType = form.dataset.customRuleForm === 'deduct' ? 'deduct' : 'earn';
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const pointsValue = Number(data.get('points'));
  const points = Math.max(1, Math.min(99, pointsValue || 0));

  if (!title) {
    showCustomRuleModal(ruleType, '请先填写内容。');
    return;
  }
  if (!Number.isFinite(pointsValue) || pointsValue < 1) {
    showCustomRuleModal(ruleType, '请输入正确的积分数。');
    return;
  }

  const nextRule = {
    id: `custom-${ruleType}-${Date.now()}`,
    title,
    points,
    description: ''
  };
  if (ruleType === 'deduct') {
    state.customDeductRules.unshift(nextRule);
  } else {
    state.customPointRules.unshift(nextRule);
  }
  closeModal();
  showToast(ruleType === 'deduct' ? '新的减分项目已添加。' : '新的加分项目已添加。');
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
  const reward = REWARDS.find(item => item.id === id);
  if (!reward) return;
  if (!spendPoints(reward.cost)) return;
  const time = Date.now();
  state.exchangedRewards.unshift({ ...reward, exchangeId: `${reward.id}-${time}`, time, redeemedAt: null });
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
  if (!spendPoints(20)) return;
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

  addRecord(state, `积分抽奖：${reward.name}`, (reward.type === 'points' ? reward.points : 0) - 20, { category: 'shop' });

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
  syncPetTime();
  persist();
  clearInterval(additionTimerId);
  appShell.classList.toggle('skip-render-animation', skipNextRenderAnimation);
  syncShellVisibility();
  renderNavigation(tab);
  renderHeaderSwitch(tab);
  app.innerHTML = (views[tab] || views.points)();
  ensureAdditionTimer();
  skipNextRenderAnimation = false;
  requestAnimationFrame(() => appShell.classList.remove('skip-render-animation'));
}

function showPlanetModal() {
  if (!state.pet) return;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-card">
      <h2>哎呀</h2>
      <p class="big-copy">你的${state.pet.name}因为太久没来，已经去宠物星球了。</p>
      <p>如果你想复活它，需要花费 <strong>${state.pet.reviveCost} 积分</strong>。复活后等级回到 Lv.0，需要重新养。</p>
      <div class="actions">
        <button class="btn danger" data-action="revive">复活它</button>
        <button class="btn ghost" data-action="close-modal">先等等</button>
      </div>
    </div>`;
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

function openMy() {
  state.mySection = null;
  persist();
  closeDrawer();
  render('my');
}


function closePlanTypeMenus() {
  document.querySelectorAll('[data-plan-type-menu]').forEach(menu => menu.classList.add('hidden'));
  document.querySelectorAll('[data-plan-type-trigger]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
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
        <input name="title" type="text" maxlength="24" placeholder="例如：背 5 个单词" aria-label="任务名称" required>
        <input name="points" type="number" min="1" max="50" value="5" aria-label="任务积分" required>
        <div class="plan-type-select" data-plan-type>
          <input type="hidden" name="planType" value="${draftPlanType}">
          <button class="plan-type-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" data-plan-type-trigger>
            <span data-plan-type-label>${draftPlanTypeLabel}</span>
            <span class="plan-type-arrow" aria-hidden="true"></span>
          </button>
          <div class="plan-type-menu hidden" role="listbox" aria-label="任务类型" data-plan-type-menu>
            <button class="plan-type-option ${draftPlanType === 'single' ? 'is-active' : ''}" type="button" role="option" aria-selected="${draftPlanType === 'single' ? 'true' : 'false'}" data-plan-type-option="single">
              <span class="plan-type-check" aria-hidden="true">✓</span>
              <span>单次</span>
            </button>
            <button class="plan-type-option ${draftPlanType === 'longTerm' ? 'is-active' : ''}" type="button" role="option" aria-selected="${draftPlanType === 'longTerm' ? 'true' : 'false'}" data-plan-type-option="longTerm">
              <span class="plan-type-check" aria-hidden="true">✓</span>
              <span>长期</span>
            </button>
          </div>
        </div>
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

function addPlan(form) {
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const points = Math.max(1, Math.min(50, Number(data.get('points')) || 5));
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
  feed: feedPet,
  play: playPet,
  rest: restPet,
  revive: revivePet,
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
  if (event.target === modal && !modal.classList.contains('hidden')) {
    closeModal();
    return;
  }
  if (event.target === navBackdrop && navDrawer.classList.contains('open')) {
    closeDrawer();
    return;
  }

  if (!event.target.closest('[data-plan-type]')) {
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
  if (target.dataset.pointsBoardView) {
    state.pointsBoardView = target.dataset.pointsBoardView;
    persist();
    skipNextRenderAnimation = true;
    render('my');
  }
  if (target.dataset.petSection) {
    state.petSection = target.dataset.petSection;
    persist();
    state.mySection = 'pet';
    render('my');
  }
  if (target.dataset.openPlanModal !== undefined) {
    showPlanModal();
    return;
  }
  if (target.dataset.adopt) adoptPet(target.dataset.adopt);
  if (target.dataset.petPick) selectPreviewPet(target.dataset.petPick);
  if (target.dataset.petDetail) showPetDetailModal(target.dataset.petDetail);
  if (target.dataset.literacyCreate !== undefined) showCreateLiteracyModal();
  if (target.dataset.literacyDelete) deleteLiteracyItem(target.dataset.literacyDelete);
  if (target.dataset.literacyPreviewMove) moveLiteracyPreview(target.dataset.literacyPreviewId, target.dataset.literacyPreviewMove);
  if (target.dataset.literacyPreview) showLiteracyPreviewModal(target.dataset.literacyPreview);
  if (target.dataset.literacyEdit) showLiteracyModal(target.dataset.literacyEdit);
  if (target.dataset.literacyMore) showLiteracyModal(target.dataset.literacyMore);
  if (target.dataset.wordCreate !== undefined) showCreateWordModal();
  if (target.dataset.wordDelete) deleteWordItem(target.dataset.wordDelete);
  if (target.dataset.wordPreviewMove) moveWordPreview(target.dataset.wordPreviewId, target.dataset.wordPreviewMove);
  if (target.dataset.wordPreview) showWordPreviewModal(target.dataset.wordPreview);
  if (target.dataset.wordEdit) showWordModal(target.dataset.wordEdit);
  if (target.dataset.wordMore) showWordModal(target.dataset.wordMore);
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
  if (target.dataset.exchange) exchangeReward(target.dataset.exchange);
  if (target.dataset.deleteRuleKind) deleteRuleCard(target.dataset.deleteRuleKind, target.dataset.deleteRuleId);
  if (target.dataset.completePlan) completePlan(target.dataset.completePlan);
  if (target.dataset.completePlanEarn) completePlan(target.dataset.completePlanEarn, 'points');
  if (target.dataset.deletePlan) deletePlan(target.dataset.deletePlan);
  if (target.dataset.writeOff) requestWriteOffVerification(target.dataset.writeOff);
  if (target.dataset.mySection) {
    if (target.dataset.mySection === 'pet') {
      showToast('宠物馆还在装修哦');
      return;
    }
    state.mySection = target.dataset.mySection;
    persist();
    render('my');
  }
  const action = actions[target.dataset.action];
  if (action) {
    Promise.resolve(action()).catch(error => {
      console.error('Action failed:', error);
      showToast('操作失败，请稍后再试。');
    });
  }
});

document.addEventListener('submit', event => {
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

pointsText.textContent = state.points;
pointsPill.classList.toggle('negative', state.points < 0);
syncShellVisibility();
render(state.selectedTab || 'points');
syncDrawerForViewport();
