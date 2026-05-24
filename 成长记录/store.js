import { PETS, defaultState } from './data.js';

const STORAGE_KEY = 'growth-record-demo';

// Persistence and state-normalization helpers only.
// UI rendering lives in views.js; user interactions live in app.js.
export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(defaultState);
}

export function addRecord(state, text, delta = 0) {
  state.records.unshift({ text, delta, time: Date.now() });
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
  state.mySection ??= null;
  state.pointsSection ||= 'earn';
  state.shopSection ||= 'exchange';
  state.petSection ||= 'cloud';
  if (!PETS[state.previewPet]) state.previewPet = defaultState.previewPet;
  state.collectedPets = state.collectedPets.filter(type => PETS[type]);
  if (state.pet?.type && !PETS[state.pet.type]) state.pet = null;
  if (state.pet?.type && !state.collectedPets.includes(state.pet.type)) {
    state.collectedPets.push(state.pet.type);
  }
  state.exchangedRewards = state.exchangedRewards.map((reward, index) => ({
    ...reward,
    exchangeId: reward.exchangeId || `${reward.id || 'reward'}-${reward.time || Date.now()}-${index}`
  }));
  return state;
}
