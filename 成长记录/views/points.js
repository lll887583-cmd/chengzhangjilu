import { DEDUCT_RULES, POINT_RULES } from '../data.js?v=20260526h';
import { iconSvg } from './shared.js?v=20260526h';

function sortRulesByPoints(rules) {
  return [...rules].sort((left, right) => {
    if (left.points !== right.points) return left.points - right.points;
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
  const rules = sortRulesByPoints(
    [...baseRules, ...customRules].filter(rule => !hiddenRuleIds.has(rule.id))
  );

  return `
    <section class="points-page">
      <div class="rule-list adaptive">${rules.map(rule => `
        <article class="rule-card ${isDeduct ? 'deduct' : ''}" role="button" tabindex="0" data-speak="${rule.title}，${isDeduct ? '会减分' : '完成后可以加分'} ${rule.points} 积分">
          <button class="rule-delete" type="button" data-delete-rule-kind="${rule.kind}" data-delete-rule-id="${rule.deleteId || rule.id}" aria-label="删除${rule.title}">${iconSvg('close')}</button>
          <div class="rule-score">${isDeduct ? '-' : '+'}${rule.points}</div>
          <h3>${rule.title}</h3>
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
        <button class="rule-card rule-card-add" type="button" data-open-custom-rule="${isDeduct ? 'deduct' : 'earn'}" aria-label="${isDeduct ? '新增减分项目' : '新增加分项目'}">
          <span class="rule-card-add-icon">${iconSvg('add')}</span>
        </button>
      </div>
    </section>`;
}
