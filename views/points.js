import { DEDUCT_RULES, POINT_RULES } from '../data.js';

export function pointsView(state) {
  const pointsSection = state.pointsSection || 'earn';
  const isDeduct = pointsSection === 'deduct';
  const rules = isDeduct ? DEDUCT_RULES : POINT_RULES;

  return `
    <section class="points-page">
      <div class="rule-list adaptive">${rules.map((rule, index) => `
        <article class="rule-card ${isDeduct ? 'deduct' : ''}">
          <div class="rule-score">${isDeduct ? '-' : '+'}${rule[1]}</div>
          <h3>${rule[0]}</h3>
          ${rule[2] ? `<p>${rule[2]}</p>` : ''}
          <button class="btn ${isDeduct ? 'danger' : 'ghost'}" ${isDeduct ? `data-deduct="${index}"` : `data-earn="${index}"`}>
            ${isDeduct ? '扣减' : '完成'}
          </button>
        </article>
      `).join('')}</div>
    </section>`;
}
