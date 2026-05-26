import { DEMO_ACCOUNTS, PETS, defaultState } from './data.js';

const STORAGE_KEY = 'growth-record-demo';
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

// Persistence and state-normalization helpers only.
// UI rendering lives in views.js; user interactions live in app.js.
export function loadState() {
  const saved = storage().getItem(STORAGE_KEY);
  if (!saved) return clone(defaultState);

  try {
    return normalizeState({ ...clone(defaultState), ...JSON.parse(saved) });
  } catch {
    return clone(defaultState);
  }
}

export function saveState(state) {
  normalizeState(state);
  storage().setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  storage().removeItem(STORAGE_KEY);
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
  state.currentUser ??= null;
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
  state.customDeductRules = Array.isArray(state.customDeductRules) ? state.customDeductRules : [];
  state.hiddenPointRuleIds = Array.isArray(state.hiddenPointRuleIds) ? state.hiddenPointRuleIds : [];
  state.hiddenDeductRuleIds = Array.isArray(state.hiddenDeductRuleIds) ? state.hiddenDeductRuleIds : [];
  state.petSection ||= 'cloud';
  state.calendarMonth ||= null;
  if (state.selectedTab === 'pet') state.selectedTab = 'points';
  if (state.currentUser && !DEMO_ACCOUNTS.some(account => account.id === state.currentUser.id)) {
    state.currentUser = null;
  }
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
  state.customDeductRules = state.customDeductRules.map((rule, index) => ({
    id: rule.id || `custom-deduct-${Date.now()}-${index}`,
    title: rule.title || '自定义扣减',
    points: Math.max(1, Number(rule.points) || 1),
    description: rule.description || ''
  }));
  state.exchangedRewards = state.exchangedRewards.map((reward, index) => ({
    ...reward,
    exchangeId: reward.exchangeId || `${reward.id || 'reward'}-${reward.time || Date.now()}-${index}`
  }));
  return state;
}
