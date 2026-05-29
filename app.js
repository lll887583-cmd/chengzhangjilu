import { DEDUCT_RULES, LOTTERY, PETS, POINT_RULES, REWARDS } from './data.js?v=20260528c';
import { addRecord, buildBackupPayload, importPersistedState, loadState, resetState, saveState, spend } from './store.js?v=20260528c';
import { calendarView, literacyView, myView, planningView, pointsView, sectionSwitch, shopView } from './views.js?v=20260528c';

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
const tabbar = document.querySelector('.tabbar');
const moreMenu = document.querySelector('#moreMenu');
const moreNav = document.querySelector('.more-nav');
const moreToggle = document.querySelector('.more-toggle');
let pendingWriteOff = null;
let skipNextRenderAnimation = false;
let literacyPreviewTouch = null;
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
  shop: () => shopView(state),
  my: () => myView(state)
};

const NAV_ITEMS = [
  { value: 'points', label: '记录', viewBox: '0 0 24 24', icon: '<path d="M3 5.25A2.25 2.25 0 0 1 5.25 3h3.5A2.25 2.25 0 0 1 11 5.25v3.5A2.25 2.25 0 0 1 8.75 11h-3.5A2.25 2.25 0 0 1 3 8.75v-3.5Zm10 0A2.25 2.25 0 0 1 15.25 3h3.5A2.25 2.25 0 0 1 21 5.25v3.5A2.25 2.25 0 0 1 18.75 11h-3.5A2.25 2.25 0 0 1 13 8.75v-3.5Zm-10 10A2.25 2.25 0 0 1 5.25 13h3.5A2.25 2.25 0 0 1 11 15.25v3.5A2.25 2.25 0 0 1 8.75 21h-3.5A2.25 2.25 0 0 1 3 18.75v-3.5Zm10 0A2.25 2.25 0 0 1 15.25 13h3.5A2.25 2.25 0 0 1 21 15.25v3.5A2.25 2.25 0 0 1 18.75 21h-3.5A2.25 2.25 0 0 1 13 18.75v-3.5Z"/>' },
  { value: 'literacy', label: '识字', viewBox: '0 0 1024 1024', icon: '<path d="M124.917811 807.146348c0 84.278766 68.256478 148.556418 152.530149 148.556418h582.492975a41.571343 41.571343 0 0 0 41.591722-41.591721 41.571343 41.571343 0 0 0-41.591722-41.591722c-38.208955 0-69.351801-27.16402-69.351801-65.372975 0-38.208955 31.142846-65.372975 69.351801-65.372975 21.692498 0 38.805015-16.720239 40.796975-37.913473h0.794747V141.475025c0-38.310846-31.04605-69.356896-69.351801-69.356896H194.269612c-38.310846 0-69.351801 31.04605-69.351801 73.335722v637.911244m207.958607-530.951642h360.595741c22.986507 0 41.591721 14.050706 41.591722 31.407761 0 17.35196-18.605214 31.402667-41.591722 31.402667H332.876418c-22.986507 0-41.591721-14.050706-41.591721-31.402667 0-17.357055 18.605214-31.402667 41.591721-31.402667z m0 196.521393h360.595741c22.986507 0 41.591721 14.050706 41.591722 31.402666 0 17.357055-18.605214 31.402667-41.591722 31.402667H332.876418c-22.986507 0-41.591721-14.045612-41.591721-31.402667 0-17.35196 18.605214-31.402667 41.591721-31.402666z m-55.428458 423.584477c-38.208955 0-69.346706-27.16402-69.346706-65.372975 0-38.208955 31.142846-65.372975 69.351801-65.372975h447.263841c-10.749453 20.892657-17.316299 40.195821-17.316299 65.372975 0 25.17206 6.673831 44.475224 17.316299 65.372975H277.44796z" fill="currentColor"></path>' },
  { value: 'calendar', label: '打卡', viewBox: '0 0 1024 1024', icon: '<path d="M896 405.333333v426.666667a85.333333 85.333333 0 0 1-85.333333 85.333333H213.333333a85.333333 85.333333 0 0 1-85.333333-85.333333v-426.666667h768z m-272.213333 96.597334l-3.712 3.84-147.925334 175.061333-55.808-64.853333-3.754666-3.84a42.666667 42.666667 0 0 0-64.170667 55.296l3.242667 4.266666 88.533333 102.741334 3.626667 3.712a42.666667 42.666667 0 0 0 57.472 0l3.84-4.053334 180.138666-213.248 3.2-4.266666a42.666667 42.666667 0 0 0-64.682666-54.656zM725.333333 106.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v42.666667h42.666667a85.333333 85.333333 0 0 1 85.333333 85.333333V341.333333H128V277.333333a85.333333 85.333333 0 0 1 85.333333-85.333333h42.666667v-42.666667a42.666667 42.666667 0 1 1 85.333333 0v42.666667h341.333334v-42.666667a42.666667 42.666667 0 0 1 42.666666-42.666666z"/>' },
  { value: 'shop', label: '商城', viewBox: '0 0 24 24', icon: '<path d="M6.25 5A3.25 3.25 0 0 1 9.5 1.75h5A3.25 3.25 0 0 1 17.75 5V6h.75A2.75 2.75 0 0 1 21.25 8.75v9.5A2.75 2.75 0 0 1 18.5 21H5.5a2.75 2.75 0 0 1-2.75-2.75v-9.5A2.75 2.75 0 0 1 5.5 6h.75V5Zm10 0A1.75 1.75 0 0 0 14.5 3.25h-5A1.75 1.75 0 0 0 7.75 5V6h8.5V5Zm-8 4a.75.75 0 0 0-1.5 0v1a.75.75 0 0 0 1.5 0V9Zm9 0a.75.75 0 0 0-1.5 0v1a.75.75 0 0 0 1.5 0V9Z"/>' }
];

function navButton(item, activeTab) {
  return `
    <button data-tab="${item.value}" class="${item.value === activeTab ? 'active' : ''}">
      <svg aria-hidden="true" focusable="false" viewBox="${item.viewBox || '0 0 24 24'}">${item.icon}</svg>
      <span>${item.label}</span>
    </button>`;
}

function renderNavigation(activeTab) {
  tabbar.innerHTML = NAV_ITEMS.map(item => navButton(item, activeTab)).join('');
  moreMenu.innerHTML = NAV_ITEMS.map(item => navButton(item, activeTab)).join('');
}

function syncShellVisibility() {
  appShell.classList.remove('logged-out');
  topbar.hidden = false;
  tabbar.hidden = false;
  moreNav.hidden = false;
}

function normalizeUiState() {
  if (!NAV_ITEMS.some(item => item.value === state.selectedTab)) {
    state.selectedTab = NAV_ITEMS[0]?.value || 'points';
  }
}

function persist() {
  normalizeUiState();
  saveState(state);
  pointsText.textContent = state.points;
  pointsPill.classList.toggle('negative', state.points < 0);
}

function currentCalendarMonthLabel() {
  const monthBase = state.calendarMonth ? new Date(`${state.calendarMonth}T00:00:00`) : new Date();
  return `${monthBase.getMonth() + 1}月`;
}

function currentLiteracyCountLabel() {
  const count = Array.isArray(state.literacyItems) ? state.literacyItems.length : 0;
  return `${count} 个字`;
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
  };

  headerSwitch.innerHTML = switchers[tab] || '';
  headerSwitch.hidden = !switchers[tab];
  topbar.classList.toggle('no-switch', !switchers[tab]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  speakToast(message);
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function speakToast(message) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  const spokenText = message
    .replace(/[\u2B50\u{1F31F}\u{1F331}\u{1F36C}\u{1F4FA}\u{1F389}\u2728\u{1F9F8}\u{1F36A}\u{1F381}\u{1F34E}\u{1FA80}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spokenText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.95;
  utterance.pitch = 1.08;
  utterance.volume = 1;
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
  state.points += points;
  addRecord(state, `${name}，加分 ${points} 积分`, points, { category, source: 'points-rule' });
  showToast(`太棒了！加分 ${points} 积分。`);
  persist();
  render('points');
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
  state.points += rule.points;
  addRecord(state, `${rule.title}，加分 ${rule.points} 积分`, rule.points, { category: 'points', source: 'custom-points-rule' });
  showToast(`太棒了！加分 ${rule.points} 积分。`);
  persist();
  render('points');
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
  const total = items.length;
  const dotIndex = total <= 1 ? 0 : Math.min(2, Math.floor((index / (total - 1)) * 3));
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
      <div class="literacy-preview-footer">
        <div class="literacy-preview-dots" aria-label="字卡浏览进度">
          ${[0, 1, 2].map(dot => `<span class="literacy-preview-dot ${dot === dotIndex ? 'active' : ''}"></span>`).join('')}
        </div>
      </div>
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
        ${['red', 'yellow', 'green'].map(color => `
          <button class="literacy-color-option ${color} ${activeColor === color ? 'active' : ''}" type="button" data-literacy-color="${color}" aria-pressed="${activeColor === color}">
            <span></span>
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
        <h2>新增识字卡</h2>
      </div>
      <label class="custom-rule-field">
        <span>汉字</span>
        <input name="text" type="text" maxlength="1" autocomplete="off" value="${safeText}" placeholder="输入 1 个字" aria-label="输入待巩固字" required>
      </label>
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
    color: 'red',
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

  if (reward.points) {
    state.points += reward.points;
  } else {
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

  addRecord(state, `积分抽奖：${reward.name}`, reward.points - 20, { category: 'shop' });
  showToast(reward.points ? `抽到了：${reward.name}` : `抽到了：${reward.name}，已放入我的兑换。`);
  persist();
  render('shop');
}

function render(tab = state.selectedTab) {
  state.selectedTab = tab;
  syncPetTime();
  persist();
  appShell.classList.toggle('skip-render-animation', skipNextRenderAnimation);
  syncShellVisibility();
  renderNavigation(tab);
  renderHeaderSwitch(tab);
  app.innerHTML = (views[tab] || views.points)();
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

function goToTab(tab) {
  if (!NAV_ITEMS.some(item => item.value === tab)) return;
  if (tab !== 'my') state.mySection = null;
  moreNav?.classList.remove('open');
  moreToggle?.setAttribute('aria-expanded', 'false');
  render(tab);
}

function jumpToTab(tab) {
  state.mySection = null;
  render(tab);
}

function goHome() {
  state.mySection = null;
  state.pointsSection = 'earn';
  persist();
  render('points');
}

function openRecordsDetail() {
  state.mySection = 'records';
  persist();
  render('my');
}

function openMy() {
  state.mySection = null;
  persist();
  render('my');
}

function toggleMore() {
  const isOpen = moreNav?.classList.toggle('open');
  moreToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
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
  state.points += plan.points;
  addRecord(state, `${plan.title}，加分 ${plan.points} 积分`, plan.points, { category: 'study', source: 'planning' });
  showToast(`学习任务完成，加分 ${plan.points} 积分。`);
  persist();
  render(sourceTab);
}


function deletePlan(planId) {
  const beforeCount = state.plans.length;
  state.plans = state.plans.filter(item => item.id !== planId);
  if (state.plans.length === beforeCount) return;
  showToast('学习任务已删除。');
  persist();
  render('planning');
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
  'toggle-more': toggleMore,
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
  if (target.dataset.literacyColor) {
    const form = target.closest('[data-literacy-edit-form]');
    form?.querySelectorAll('[data-literacy-color]').forEach(option => {
      const active = option.dataset.literacyColor === target.dataset.literacyColor;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const colorInput = form?.querySelector('input[name="color"]');
    if (colorInput) colorInput.value = target.dataset.literacyColor;
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
  }
  const literacyCard = event.target.closest('[data-literacy-preview]');
  if (literacyCard && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    showLiteracyPreviewModal(literacyCard.dataset.literacyPreview);
    return;
  }
  const target = event.target.closest('[data-speak]');
  if (!target || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  speakToast(target.dataset.speak);
});

modal.addEventListener('touchstart', event => {
  const previewModal = event.target.closest('[data-literacy-preview-active]');
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
  handleLiteracyPreviewSwipe(literacyPreviewTouch, touch);
  literacyPreviewTouch = null;
}, { passive: true });

let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  if (!moreNav) return;
  const currentY = window.scrollY;
  moreNav.classList.toggle('nav-hidden', currentY > lastScrollY && currentY > 80);
  lastScrollY = currentY;
}, { passive: true });

pointsText.textContent = state.points;
pointsPill.classList.toggle('negative', state.points < 0);
syncShellVisibility();
render(state.selectedTab || 'points');
