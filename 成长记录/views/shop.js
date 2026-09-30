import { REWARDS } from '../data.js?v=20261001e';
import { formatPoints } from './shared.js?v=20261001e';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 排序：与「加减分」那套（正序 / 倒序 / 最新）保持一致，只是这里的「大小」是所需积分。
 * - asc（正序）  积分从少到多——默认值，孩子一眼看到现在能换什么
 * - desc（倒序） 积分从多到少
 * - latest（最新）最近添加的在前
 */
function sortRewards(rewards, mode) {
  const byOrder = (left, right) => left.order - right.order;
  if (mode === 'desc') return [...rewards].sort((left, right) => (right.cost - left.cost) || byOrder(left, right));
  if (mode === 'latest') return [...rewards].sort((left, right) => ((right.createdAt || 0) - (left.createdAt || 0)) || byOrder(left, right));
  return [...rewards].sort((left, right) => (left.cost - right.cost) || byOrder(left, right));
}

/**
 * 兑换项目 = 内置 REWARDS（可隐藏） + 自定义项目（state.customShopRewards）。
 * 做法与「加减分」完全一致：
 * - 删除内置项 → 把 id 记进 hiddenRewardIds（功能代码不动，只是不再显示）
 * - 编辑内置项 → 复制成一条自定义项，原内置项记进 hiddenRewardIds
 */
export function getShopRewards(state) {
  const hidden = new Set(state?.hiddenRewardIds || []);
  const builtin = REWARDS
    .filter(reward => !hidden.has(reward.id))
    .map((reward, index) => ({ kind: 'shop', id: reward.id, name: reward.name, cost: reward.cost, icon: reward.icon, createdAt: 0, order: index }));
  const custom = (state?.customShopRewards || []).map((item, index) => ({
    kind: 'shop-custom',
    id: item.id,
    name: item.name,
    cost: item.cost,
    icon: 'gift',
    createdAt: Number(item.createdAt) || 0,
    order: 1000 + index
  }));
  return sortRewards([...builtin, ...custom], state?.shopSort || 'asc');
}

function rewardCard(reward) {
  const name = escapeHtml(reward.name);
  const cost = formatPoints(reward.cost);
  return `
          <article class="rule-card shop" role="button" tabindex="0" data-speak="${name}，兑换需要花掉 ${cost} 积分">
            <div class="rule-score">-${cost}</div>
            <button class="literacy-more" type="button" data-card-more-kind="${reward.kind}" data-card-more-id="${escapeHtml(reward.id)}" aria-label="更多操作">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0 1.42 0Z" fill="currentColor"></path></svg>
            </button>
            <div class="rule-title-row"><h3>${name}</h3></div>
            <button class="btn secondary" data-exchange="${escapeHtml(reward.id)}">兑换</button>
          </article>`;
}

function exchangePanel(state) {
  const rewards = getShopRewards(state);
  return `
      <section class="shop-panel">
        ${rewards.length
          ? `<div class="rule-list adaptive">${rewards.map(rewardCard).join('')}</div>`
          : '<p class="shop-empty">还没有兑换项目，点右上角的 ➕ 添加一个吧。</p>'}
      </section>`;
}

// 积分抽奖已下线，商城只保留积分兑换
export function shopView(state) {
  return `
    <section class="shop-page">
      ${exchangePanel(state)}
    </section>`;
}
