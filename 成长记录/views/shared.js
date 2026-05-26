import { PETS } from '../pets.js';
import { iconSvg } from '../icons.js?v=20260526h';

export function getPetStatus(pet) {
  if (!pet) return { label: '还没有领养宠物', tone: 'normal' };
  if (pet.status === 'planet') return { label: '去宠物星球了', tone: 'danger' };
  if (pet.energy >= 70) return { label: '开心', tone: 'happy' };
  if (pet.energy >= 40) return { label: '正常', tone: 'normal' };
  if (pet.energy >= 15) return { label: '饿了', tone: 'hungry' };
  return { label: '很饿', tone: 'danger' };
}

export function getPetInfo(state, type = state.pet?.type || state.previewPet || 'sonicHummingbird') {
  return PETS[type] || PETS.sonicHummingbird;
}

export function sectionSwitch(items, activeValue, dataName) {
  return `
    <div class="section-switch" role="tablist" aria-label="页面切换">
      ${items.map(item => `
        <button class="${activeValue === item.value ? 'active' : ''}" data-${dataName}="${item.value}" role="tab" aria-selected="${activeValue === item.value}">
          ${item.label}
        </button>
      `).join('')}
    </div>`;
}

export function metricBar(tone, icon, label, value) {
  return `
    <div class="metric ${tone}">
      <div class="metric-head"><strong><span>${iconSvg(icon, 'metric-icon')}</span>${label}</strong><b>${value}%</b></div>
      <div class="metric-track"><div class="metric-fill" style="width:${value}%"></div></div>
    </div>`;
}

export function statCard(icon, value, label) {
  return `<div class="stat-card"><span class="stat-icon ${icon}">${iconSvg(icon)}</span><div><strong>${value}</strong><small>${label}</small></div></div>`;
}

export function recordTitle(text) {
  return text.replace(/(获得|扣减)\s*(\d+)\s*积分/g, (_, action, points) => {
    const tone = action === '获得' ? 'positive' : 'negative';
    return `<span class="record-delta ${tone}">${action} ${points} 积分</span>`;
  });
}

export { iconSvg };
