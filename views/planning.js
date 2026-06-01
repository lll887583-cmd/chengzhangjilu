import { iconSvg } from './shared.js?v=20260526h';

function planCard(plan) {
  const planTypeLabel = plan.planType === 'longTerm' ? '长期' : '单次';
  return `
    <article class="plan-card ${plan.done ? 'done' : ''}">
      <span class="plan-status">${iconSvg(plan.done ? 'checklist' : 'task')}</span>
      <div>
        <h3>${plan.title}</h3>
        <p>${plan.done ? `已完成 · ${new Date(plan.completedAt).toLocaleDateString('zh-CN')} · ${planTypeLabel}` : `${planTypeLabel} · 完成后加分 ${plan.points} 积分`}</p>
      </div>
      <button class="plan-delete" type="button" data-delete-plan="${plan.id}" aria-label="删除${plan.title}">${iconSvg('trash')}</button>
      <button class="btn plan-complete-btn ${plan.done ? 'redeemed-btn' : 'secondary'}" ${plan.done ? 'disabled' : `data-complete-plan="${plan.id}"`}>
        ${plan.done ? '已完成' : '完成'}
      </button>
    </article>`;
}

export function planningView(state) {
  const planningSection = state.planningSection || 'active';
  const draftPlanType = state.planningDraftType === 'longTerm' ? 'longTerm' : 'single';
  const plans = (state.plans || []).filter(plan => planningSection === 'done'
    ? plan.done
    : (!plan.done && plan.planType !== 'longTerm'));

  return `
    <section class="planning-page">
      <div class="plan-list ${planningSection === 'active' ? 'active' : ''}">${plans.length ? plans.map(planCard).join('') : `
        <div class="empty-card">
          <strong>${planningSection === 'done' ? '还没有已完成任务' : '还没有进行中的任务'}</strong>
          <p>${planningSection === 'done' ? '完成学习任务后，会自动放到这里。' : '单次任务会显示在这里，长期任务会显示到积分-加分。'}</p>
        </div>
      `}
      ${planningSection === 'active' ? `
        <button class="plan-add-card rule-card-add" type="button" data-open-plan-modal aria-label="新增学习任务">
          <span class="rule-card-add-icon">${iconSvg('add')}</span>
        </button>
      ` : ''}</div>
    </section>`;
}
