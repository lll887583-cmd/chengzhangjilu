import { DEDUCT_RULES, LOTTERY, PETS, POINT_RULES, REWARDS } from './data.js?v=20260525r';
import { addRecord, loadState, resetState, saveState, spend } from './store.js?v=20260525r';
import { calendarView, myView, planningView, pointsView, sectionSwitch, shopView } from './views.js?v=20260525r';

// Interaction controller for the static demo.
// Data config lives in data.js; HTML templates live in views.js; persistence lives in store.js.
let state = loadState();
const app = document.querySelector('#app');
const pointsText = document.querySelector('#pointsText');
const pointsPill = document.querySelector('.points-pill');
const headerSwitch = document.querySelector('#headerSwitch');
const toast = document.querySelector('#toast');
const modal = document.querySelector('#modal');
const moreNav = document.querySelector('.more-nav');
const moreToggle = document.querySelector('.more-toggle');
let pendingWriteOff = null;

const views = {
  points: () => pointsView(state),
  planning: () => planningView(state),
  calendar: () => calendarView(state),
  shop: () => shopView(state),
  my: () => myView(state)
};

function persist() {
  saveState(state);
  pointsText.textContent = state.points;
  pointsPill.classList.toggle('negative', state.points < 0);
}

function renderHeaderSwitch(tab) {
  const switchers = {
    points: sectionSwitch([
      { value: 'earn', label: '获得' },
      { value: 'deduct', label: '扣减' }
    ], state.pointsSection || 'earn', 'points-section'),
    shop: sectionSwitch([
      { value: 'exchange', label: '积分兑换' },
      { value: 'lottery', label: '积分抽奖' }
    ], state.shopSection || 'exchange', 'shop-section'),
    planning: sectionSwitch([
      { value: 'active', label: '规划中' },
      { value: 'done', label: '已完成' }
    ], state.planningSection || 'active', 'planning-section'),
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
  addRecord(state, `${name}，获得 ${points} 积分`, points, { category, source: 'points-rule' });
  showToast(`太棒了！获得 ${points} 积分。`);
  persist();
  render('points');
}

function deductPoints(ruleIndex) {
  const [name, points] = DEDUCT_RULES[ruleIndex];
  state.points -= points;
  addRecord(state, `${name}，扣减 ${points} 积分`, -points, { category: 'deduct' });
  showToast(`已扣减 ${points} 积分。`);
  persist();
  render('points');
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
      <h2>家长验证</h2>
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
  document.querySelectorAll('.tabbar button, .more-menu button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  renderHeaderSwitch(tab);
  app.innerHTML = (views[tab] || views.points)();
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

function completePlan(planId) {
  const plan = state.plans.find(item => item.id === planId);
  if (!plan || plan.done) return;
  plan.done = true;
  plan.completedAt = Date.now();
  state.points += plan.points;
  addRecord(state, `${plan.title}，获得 ${plan.points} 积分`, plan.points, { category: 'study', source: 'planning' });
  showToast(`学习任务完成，获得 ${plan.points} 积分。`);
  persist();
  render('planning');
}


function deletePlan(planId) {
  const beforeCount = state.plans.length;
  state.plans = state.plans.filter(item => item.id !== planId);
  if (state.plans.length === beforeCount) return;
  showToast('学习任务已删除。');
  persist();
  render('planning');
}

function addPlan(form) {
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  const points = Math.max(1, Math.min(50, Number(data.get('points')) || 5));
  if (!title) return;
  state.plans.unshift({
    id: `plan-${Date.now()}`,
    title,
    points,
    category: 'study',
    done: false,
    createdAt: Date.now(),
    completedAt: null
  });
  form.reset();
  form.elements.points.value = points;
  showToast('学习任务已添加。');
  persist();
  render('planning');
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
    showToast('Demo 已重置');
    render('my');
  },
  export: () => {
    navigator.clipboard?.writeText(JSON.stringify(state, null, 2));
    showToast('备份 JSON 已复制到剪贴板');
  }
};

pointsPill.addEventListener('click', event => {
  event.stopPropagation();
  openRecordsDetail();
});

document.addEventListener('click', event => {
  if (event.target === modal && !modal.classList.contains('hidden')) {
    closeModal();
    return;
  }

  const speakTarget = event.target.closest('[data-speak]');
  if (speakTarget && !event.target.closest('button')) speakToast(speakTarget.dataset.speak);

  const target = event.target.closest('button');
  if (!target) return;

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
  if (target.dataset.petSection) {
    state.petSection = target.dataset.petSection;
    persist();
    state.mySection = 'pet';
    render('my');
  }
  if (target.dataset.adopt) adoptPet(target.dataset.adopt);
  if (target.dataset.petPick) selectPreviewPet(target.dataset.petPick);
  if (target.dataset.petDetail) showPetDetailModal(target.dataset.petDetail);
  if (target.dataset.earn) earnPoints(Number(target.dataset.earn));
  if (target.dataset.deduct) deductPoints(Number(target.dataset.deduct));
  if (target.dataset.exchange) exchangeReward(target.dataset.exchange);
  if (target.dataset.completePlan) completePlan(target.dataset.completePlan);
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
  actions[target.dataset.action]?.();
});

document.addEventListener('submit', event => {
  if (event.target.matches('[data-plan-form]')) {
    event.preventDefault();
    addPlan(event.target);
    return;
  }
  if (!event.target.matches('[data-write-off-form]')) return;
  event.preventDefault();
  submitWriteOffVerification();
});

document.addEventListener('keydown', event => {
  const target = event.target.closest('[data-speak]');
  if (!target || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  speakToast(target.dataset.speak);
});

let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  if (!moreNav) return;
  const currentY = window.scrollY;
  moreNav.classList.toggle('nav-hidden', currentY > lastScrollY && currentY > 80);
  lastScrollY = currentY;
}, { passive: true });

goHome();
