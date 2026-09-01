import { DEDUCT_RULES, POINT_RULES } from '../data.js?v=20260526h';
import { formatPoints, iconSvg } from './shared.js?v=20260826f';

function sortRules(rules, savedOrder, mode) {
  if (mode === 'asc') return [...rules].sort((left, right) => left.points - right.points);
  if (mode === 'desc') return [...rules].sort((left, right) => right.points - left.points);
  if (mode === 'latest') return [...rules].sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
  const order = new Map(savedOrder.map((id, index) => [id, index]));
  return [...rules].sort((left, right) => {
    const leftOrder = order.get(left.id);
    const rightOrder = order.get(right.id);
    if (leftOrder !== undefined || rightOrder !== undefined) {
      return (leftOrder ?? 10000) - (rightOrder ?? 10000);
    }
    return (left.order || 0) - (right.order || 0);
  });
}

export function pointsView(state) {
  const pointsSection = state.pointsSection || 'earn';
  const isDeduct = pointsSection === 'deduct';
  const hiddenRuleIds = new Set(isDeduct ? (state.hiddenDeductRuleIds || []) : (state.hiddenPointRuleIds || []));
  const customRules = (isDeduct ? (state.customDeductRules || []) : (state.customPointRules || []))
    .map((rule, index) => ({
      kind: isDeduct ? 'deduct-custom' : 'point-custom',
      id: rule.id,
      title: rule.title,
      points: rule.points,
      description: rule.description || '',
      createdAt: rule.createdAt || 0,
      planType: rule.planType === 'longTerm' ? 'longTerm' : 'single',
      order: 1000 + index
    }));
  const longTermPlans = (state.plans || [])
    .filter(plan => !plan.done && plan.planType === 'longTerm')
    .map((plan, index) => ({
      kind: 'plan',
      id: plan.id,
      title: plan.title,
      points: plan.points,
      description: '',
      order: POINT_RULES.length + index
    }));
  const baseRules = (isDeduct
    ? DEDUCT_RULES.map((rule, index) => ({ kind: 'deduct', id: `deduct-${index}`, index, title: rule[0], points: rule[1], description: rule[2], order: index }))
    : [
      ...POINT_RULES.map((rule, index) => ({ kind: 'point', id: `point-${index}`, index, title: rule[0], points: rule[1], description: rule[2], order: index })),
      ...longTermPlans.map(plan => ({ ...plan, deleteId: plan.id }))
    ]);
  const savedOrder = isDeduct ? (state.deductRuleOrder || []) : (state.pointRuleOrder || []);
  const rules = sortRules([...baseRules, ...customRules].filter(rule => !hiddenRuleIds.has(rule.id)), savedOrder, state.pointsSort || 'manual');

  return `
    <section class="points-page">
      <div class="rule-list adaptive">${rules.map(rule => `
        <article class="rule-card ${isDeduct ? 'deduct' : ''}" role="button" tabindex="0" draggable="false" data-rule-id="${rule.id}" data-rule-context-kind="${rule.kind}" data-rule-context-id="${rule.deleteId || rule.id}" data-speak="${rule.title}，${isDeduct ? '会减分' : '完成后可以加分'} ${formatPoints(rule.points)} 积分">
          <div class="rule-score">${isDeduct ? '-' : '+'}${formatPoints(rule.points)}</div>
          <button class="literacy-more" type="button" data-card-more-kind="${rule.kind}" data-card-more-id="${rule.deleteId || rule.id}" aria-label="更多操作">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0 1.42 0Z" fill="currentColor"></path></svg>
          </button>
          <div class="rule-title-row">
            <h3>${rule.title}</h3>
            ${!['point', 'deduct', 'plan'].includes(rule.kind) && rule.planType !== 'longTerm' ? '<span class="rule-type-badge">次</span>' : ''}
          </div>
          ${rule.description ? `<p>${rule.description}</p>` : ''}
          <button class="btn ${isDeduct ? 'danger' : 'ghost'}" ${isDeduct
            ? (rule.kind === 'deduct-custom' ? `data-deduct-custom="${rule.id}"` : `data-deduct="${rule.index}"`)
            : (rule.kind === 'plan'
              ? `data-complete-plan-earn="${rule.id}"`
              : (rule.kind === 'point-custom' ? `data-earn-custom="${rule.id}"` : `data-earn="${rule.index}"`))}>
            ${isDeduct ? '减分' : '完成'}
          </button>
        </article>
      `).join('')}
      </div>
    </section>`;
}
