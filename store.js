import { PETS, defaultState } from './data.js';

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
  state.records ||= [];
  state.exchangedRewards ||= [];
  state.collectedPets ||= [];
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
  state.shopSection ||= 'exchange';
  state.planningSection ||= 'active';
  state.pointsBoardView = ['week', 'month', 'year'].includes(state.pointsBoardView) ? state.pointsBoardView : 'week';
  state.planningDraftType = state.planningDraftType === 'longTerm' ? 'longTerm' : 'single';
  state.customPointRules = Array.isArray(state.customPointRules) ? state.customPointRules : [];
  state.literacyItems = Array.isArray(state.literacyItems) ? state.literacyItems : [];
  state.numberBoardSelections = Array.isArray(state.numberBoardSelections) ? state.numberBoardSelections : [];
  state.additionGame = state.additionGame && typeof state.additionGame === 'object'
    ? state.additionGame
    : null;
  state.pinyinSelections = Array.isArray(state.pinyinSelections) ? state.pinyinSelections : [];
  state.letterSelections = Array.isArray(state.letterSelections) ? state.letterSelections : [];
  state.wordItems = Array.isArray(state.wordItems) ? state.wordItems : [];
  state.customDeductRules = Array.isArray(state.customDeductRules) ? state.customDeductRules : [];
  state.hiddenPointRuleIds = Array.isArray(state.hiddenPointRuleIds) ? state.hiddenPointRuleIds : [];
  state.hiddenDeductRuleIds = Array.isArray(state.hiddenDeductRuleIds) ? state.hiddenDeductRuleIds : [];
  state.petSection ||= 'cloud';
  state.calendarMonth ||= null;
  if (state.selectedTab === 'pet') state.selectedTab = 'points';
  if (!PETS[state.previewPet]) state.previewPet = defaultState.previewPet;
  state.collectedPets = state.collectedPets.filter(type => PETS[type]);
  if (state.pet?.type && !PETS[state.pet.type]) state.pet = null;
  if (state.pet?.type && !state.collectedPets.includes(state.pet.type)) {
    state.collectedPets.push(state.pet.type);
  }
  state.plans = state.plans.map((plan, index) => ({
    title: plan.title || '学习任务',
    points: Number(plan.points) || 0,
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
    points: Math.max(1, Number(rule.points) || 1),
    description: rule.description || ''
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
    points: Math.max(1, Number(rule.points) || 1),
    description: rule.description || ''
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
