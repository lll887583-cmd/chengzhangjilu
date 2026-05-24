import { PETS } from '../pets.js';
import { getPetInfo, getPetStatus, iconSvg, metricBar, statCard } from './shared.js';

function petImage(state, pet = state.pet || getPetInfo(state)) {
  const info = getPetInfo(state, pet.type);
  return pet.image || info.image;
}

export function petView(state) {
  const petSection = state.petSection || 'cloud';
  const collectedPets = new Set([...(state.collectedPets || []), ...(state.pet?.type ? [state.pet.type] : [])]);

  if (petSection === 'hall') {
    return `
      <section class="pet-console">
        <div class="pet-hall is-gallery" aria-label="宠物馆图鉴">
          <div class="pet-hall-head">
            <h3>宠物馆</h3>
            <p>所有宠物图鉴都在这里，点击卡片查看详情。</p>
          </div>
          <div class="pet-picker" aria-label="宠物图鉴列表">
          ${Object.values(PETS).map(pet => `
            <button class="pet-avatar ${collectedPets.has(pet.type) ? 'collected' : 'uncollected'}" data-pet-detail="${pet.type}" aria-label="查看${pet.name}详情">
              <img src="${pet.image}" alt="" />
              <strong>${pet.name}${pet.featured ? ' ⭐' : ''}</strong>
              <small>${collectedPets.has(pet.type) ? '已收集' : `未收集 · ${pet.adoptCost}积分`}</small>
            </button>
          `).join('')}
          </div>
        </div>
      </section>`;
  }

  const activeType = petSection === 'cloud'
    ? (state.pet?.type || state.previewPet || 'sonicHummingbird')
    : (state.previewPet || state.pet?.type || 'sonicHummingbird');
  const activeInfo = getPetInfo(state, activeType);
  const activePet = state.pet?.type === activeType ? state.pet : activeInfo;
  const selectedCurrentPet = Boolean(state.pet && state.pet.type === activeType);
  const status = getPetStatus(selectedCurrentPet ? state.pet : null);
  const isCollected = collectedPets.has(activeType);
  const health = selectedCurrentPet ? state.pet.energy : activeInfo.baseHealth;
  const happiness = selectedCurrentPet
    ? Math.min(100, Math.round(76 + state.pet.energy / 5 + state.pet.level * 4))
    : activeInfo.baseHappiness;
  const currentPetInfo = state.pet ? getPetInfo(state, state.pet.type) : null;
  const canAdoptSelected = !state.pet || state.pet.status === 'planet';
  const petStatusLine = selectedCurrentPet
    ? `${status.label} · Lv.${state.pet.level}`
    : `${isCollected ? '已收集' : '未收集'} · 领养需要 ${activeInfo.adoptCost} 积分`;
  const showPetMeters = petSection !== 'hall' || isCollected;

  return `
    <section class="pet-console">
      <div class="pet-main-row">
        ${petSection === 'cloud' ? `
          <div class="pet-interaction-panel" aria-label="宠物互动">
            <span class="panel-kicker">和宠物互动</span>
            <h3>${state.pet ? activePet.name : '还没有云宠物'}</h3>
            <p>${state.pet ? '喂食、玩耍和睡觉会继续提升成长值。' : '先去宠物馆选择喜欢的伙伴，领养后会住在这里。'}</p>
            ${state.pet ? `
            <div class="care-actions side">
              <button class="care-card" data-action="feed" ${state.pet.status === 'planet' ? 'disabled' : ''}>
                <span class="care-icon feed">${iconSvg('restaurant')}</span><strong>喂食</strong><small>10 积分</small>
              </button>
              <button class="care-card primary" data-action="play" ${state.pet.status === 'planet' ? 'disabled' : ''}>
                <span class="care-icon play">${iconSvg('game')}</span><strong>玩耍</strong><small>8 积分</small>
              </button>
              <button class="care-card" data-action="rest" ${state.pet.status === 'planet' ? 'disabled' : ''}>
                <span class="care-icon sleep">${iconSvg('bedtime')}</span><strong>睡觉</strong><small>5 积分</small>
              </button>
            </div>
            ${state.pet.status === 'planet' ? `<button class="btn danger revive-wide" data-action="revive">复活 ${state.pet.reviveCost} 积分</button>` : ''}
            ` : `
              <button class="btn adopt-wide" data-adopt="${activeInfo.type}">领养</button>
            `}
          </div>
        ` : `
          <div class="pet-interaction-panel" aria-label="宠物图鉴">
            <span class="panel-kicker">宠物图鉴</span>
            <h3>${activeInfo.name}</h3>
            <p>查看每只宠物的介绍、健康值和幸福感，已收集和未收集都会放在这里。</p>
            ${canAdoptSelected ? `
              <button class="btn adopt-wide" data-adopt="${activeInfo.type}">领养</button>
            ` : selectedCurrentPet ? `
              <div class="pet-note">
                <strong>${activeInfo.name} 正在云宠物里</strong>
                <span>切到云宠物可以继续喂食、玩耍和睡觉。</span>
              </div>
              <button class="btn ghost adopt-wide" data-pet-section="cloud">去云宠物</button>
            ` : `
              <div class="pet-note">
                <strong>当前伙伴是 ${currentPetInfo?.name || state.pet.name}</strong>
                <span>先专心照顾它，其他宠物暂时放在未收集区。</span>
              </div>
            `}
          </div>
        `}

        <div class="pet-portrait ${isCollected ? 'is-collected' : 'is-uncollected'}" aria-label="${activeInfo.name}">
          <span class="collection-badge">${isCollected ? '已收集' : '未收集'}</span>
          <img src="${petImage(state, activePet)}" alt="${activePet.name}" />
          <h2>${activeInfo.name}</h2>
          <p class="pet-state-line">${petStatusLine}</p>
          ${showPetMeters ? `<div class="pet-card-meters" aria-label="宠物状态">
            ${metricBar('health', 'heart', '健康值', health)}
            ${metricBar('happy', 'smile', '幸福感', happiness)}
          </div>` : ''}
        </div>
      </div>
    </section>`;
}

export function homeView(state) {
  const status = getPetStatus(state.pet);
  return `
    <div class="grid home-grid">
      ${petView(state)}
      <aside class="grid stat-row">
        <section class="card">
          <h3>今日任务</h3>
          <p>完成一个任务，给宠物多一点照顾机会。</p>
          <div class="path">
            ${[1,2,3,4,5].map(i => `<div class="path-node ${i <= state.streak ? 'done' : ''}">${i}</div>`).join('')}
          </div>
          <button class="btn ghost" data-tab-jump="points" style="margin-top:18px;width:100%">去赚积分</button>
        </section>
        <section class="card">
          <h3>营地状态</h3>
          ${statCard('fire', `${state.streak} 天`, '连续照顾')}
          ${statCard('pets', status.label, '宠物状态')}
          ${statCard('checklist', state.records.length, '成长记录')}
        </section>
      </aside>
    </div>`;
}
