import { iconSvg } from '../icons.js?v=20261001d';

export function sectionSwitch(items, activeValue, dataName, extraClass = '') {
  const className = ['section-switch', extraClass].filter(Boolean).join(' ');
  return `
    <div class="${className}" role="tablist" aria-label="页面切换">
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

export function formatPoints(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : '0';
}

export function recordTitle(text) {
  return text.replace(/(加分|减分)\s*(-?\d+(?:\.\d+)?)\s*积分/g, (_, action, points) => {
    const tone = action === '加分' ? 'positive' : 'negative';
    return `<span class="record-delta ${tone}">${action} ${formatPoints(points)} 积分</span>`;
  });
}

export { iconSvg };
