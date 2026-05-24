import { REWARDS } from '../data.js';
import { iconSvg } from './shared.js';

export function shopView(state) {
  const shopSection = state.shopSection || 'exchange';
  return `
    <section class="shop-page">
      ${shopSection === 'exchange' ? `
      <section class="card shop-panel">
        <h2>积分兑换</h2>
        <div class="reward-list">${REWARDS.map(reward => `
          <div class="reward-card">
            <h3><span class="inline-title-icon">${iconSvg(reward.icon)}</span>${reward.name}</h3>
            <p>需要 ${reward.cost} 积分，兑换后请家长确认。</p>
            <button class="btn secondary" data-exchange="${reward.id}">兑换</button>
          </div>
        `).join('')}</div>
      </section>` : `
      <section class="card shop-panel lottery-panel">
        <h2>积分抽奖</h2>
        <p class="big-copy">每次 20 积分，可能抽到小奖励，也可能只是收获一颗勇敢的心。</p>
        <div class="pet-stage" style="min-height:220px"><div class="pet-emoji"><img class="lottery-icon" src="./assets/rewards/gift_flat.svg" alt="积分抽奖" /></div></div>
        <button class="btn" data-action="lottery" style="width:100%;margin-top:18px">开始抽奖 20 积分</button>
      </section>`}
    </section>`;
}
