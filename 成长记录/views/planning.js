import { iconSvg } from './shared.js';

function planCard(plan) {
  return `
    <article class="plan-card ${plan.done ? 'done' : ''}">
      <span class="plan-status">${iconSvg(plan.done ? 'checklist' : 'task')}</span>
      <div>
        <h3>${plan.title}</h3>
        <p>${plan.done ? `已完成 · ${new Date(plan.completedAt).toLocaleDateString('zh-CN')}` : `完成后获得 ${plan.points} 积分`}</p>
      </div>
      <button class="plan-delete" type="button" data-delete-plan="${plan.id}" aria-label="删除${plan.title}">${iconSvg('trash')}</button>
      <button class="btn plan-complete-btn ${plan.done ? 'redeemed-btn' : 'secondary'}" ${plan.done ? 'disabled' : `data-complete-plan="${plan.id}"`}>
        ${plan.done ? '已完成' : '完成'}
      </button>
    </article>`;
}

export function planningView(state) {
  const planningSection = state.planningSection || 'active';
  const plans = (state.plans || []).filter(plan => planningSection === 'done' ? plan.done : !plan.done);

  return `
    <section class="planning-page">
      ${planningSection === 'active' ? `
        <section class="card plan-form-card">
          <h3>新增学习任务</h3>
          <form class="plan-form" data-plan-form>
            <input name="title" type="text" maxlength="24" placeholder="例如：背 5 个单词" aria-label="任务名称" required>
            <input name="points" type="number" min="1" max="50" value="5" aria-label="任务积分" required>
            <button class="btn ghost" type="submit">添加任务</button>
          </form>
        </section>
      ` : ''}
      <div class="plan-list">${plans.length ? plans.map(planCard).join('') : `
        <div class="empty-card">
          <strong>${planningSection === 'done' ? '还没有已完成任务' : '还没有规划中的任务'}</strong>
          <p>${planningSection === 'done' ? '完成学习任务后，会自动放到这里。' : '新增一个学习任务，完成后可以获得积分。'}</p>
        </div>
      `}</div>
    </section>`;
}
