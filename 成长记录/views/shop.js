import { REWARDS } from '../data.js';
import { iconSvg } from './shared.js';

const LOTTERY_QUESTION = '<svg aria-hidden="true" focusable="false" viewBox="0 0 1024 1024"><path d="M800.9 361.7c0 22.5-3.3 43.5-9.7 63.1s-13.8 35.5-21.8 47.9c-8.2 12.4-19.6 24.7-34.5 37.2-14.9 12.5-26.8 21.6-35.9 27.2-9.2 5.7-21.8 13-38.1 22.2-17.1 9.6-31.4 23.1-42.9 40.6-11.4 17.5-17.2 31.4-17.2 42 0 7.1-2.5 13.8-7.5 20.4-5 6.4-10.8 9.7-17.5 9.7h-150c-6.3 0-11.6-3.8-15.9-11.6-4.3-7.8-6.6-15.5-6.6-23.4v-28c0-34.6 13.5-67.2 40.6-97.8 27.1-30.6 56.9-53.3 89.4-67.9 24.6-11.3 42.1-22.9 52.5-35s15.7-27.9 15.7-47.5c0-17.5-9.7-32.9-29.1-46.3-19.3-13.3-41.8-20-67.2-20-27.1 0-49.6 6-67.6 18.1-14.6 10.4-37 34.5-66.9 71.9-5.4 6.7-11.8 10-19.3 10-5 0-10.3-1.7-15.7-5l-102.6-78.1c-5.4-4.2-8.7-9.3-9.7-15.7-1.1-6.3 0.1-12.1 3.4-17.5C293.5 167.5 390.3 112 517 112c33.4 0 66.9 6.4 100.7 19.3s64.2 30.2 91.3 51.9c27.1 21.7 49.2 48.3 66.3 79.7 17.1 31.2 25.6 64.3 25.6 98.8zM603.4 737v150c0 6.7-2.5 12.5-7.5 17.5s-10.8 7.5-17.5 7.5H428.3c-6.7 0-12.5-2.5-17.5-7.5s-7.5-10.8-7.5-17.5V737c0-6.7 2.5-12.5 7.5-17.5s10.8-7.5 17.5-7.5h150.1c6.7 0 12.5 2.5 17.5 7.5s7.5 10.7 7.5 17.5z" fill="currentColor"></path></svg>';
const LOTTERY_GIFT = '<svg class="lottery-icon" aria-hidden="true" focusable="false" viewBox="0 0 1024 1024"><path d="M681.04 64.441c-49.19-0.26-94.23 27.55-116.05 71.65L512 242.061l-52.99-105.97c-31.72-64.09-109.39-90.34-173.48-58.62-44.26 21.91-72.21 67.08-72.05 116.46 0 93.36 75.68 169.04 169.04 169.04h258.97c93.36 0 169.04-75.68 169.04-169.04-0.21-71.43-58.06-129.28-129.49-129.49z m-298.52 223.89c-52.14 0-94.41-42.27-94.41-94.41-0.27-30.29 24.06-55.07 54.36-55.34 21.11-0.19 40.46 11.76 49.75 30.71l59.33 119.03-69.03 0.01z m258.96 0h-69.03l59.33-119.03c13.33-27.2 46.19-38.45 73.39-25.12a54.85 54.85 0 0 1 30.71 49.75c0.01 52.14-42.26 94.4-94.4 94.4z" fill="#E04B3B"></path><path d="M176.16 437.591h671.67v410.47c0 61.83-50.12 111.95-111.95 111.95H288.11c-61.83 0-111.95-50.12-111.95-111.95v-410.47z" fill="#FFCE00"></path><path d="M176.16 493.561h634.36a92.93 92.93 0 0 0 37.32-7.83v-48.14H176.16v55.97z" fill="#E2B703"></path><path d="M194.82 288.331h634.36c51.52 0 93.29 41.77 93.29 93.29s-41.77 93.29-93.29 93.29H194.82c-51.52 0-93.29-41.77-93.29-93.29 0-51.53 41.77-93.29 93.29-93.29z" fill="#FFEC00"></path><path d="M437.37 288.331h149.26v186.58H437.37z" fill="#EF8C54"></path><path d="M437.37 474.901h149.26v485.1H437.37z" fill="#F16A54"></path><path d="M437.37 474.901h149.26v18.66H437.37z" fill="#D34F42"></path></svg>';
const LOTTERY_QUESTION_POSITIONS = [
  'left top',
  'left bottom',
  'right top',
  'right bottom'
];

export function shopView(state) {
  const shopSection = state.shopSection || 'exchange';
  return `
    <section class="shop-page">
      ${shopSection === 'exchange' ? `
      <section class="shop-panel">
        <div class="reward-list">${REWARDS.map(reward => `
          <div class="reward-card" role="button" tabindex="0" data-speak="${reward.name}，需要 ${reward.cost} 积分">
            <div class="reward-cost-badge"><strong>${reward.cost}</strong></div>
            <h3><span class="inline-title-icon">${iconSvg(reward.icon)}</span>${reward.name}</h3>
            <button class="btn secondary" data-exchange="${reward.id}">兑换</button>
          </div>
        `).join('')}</div>
      </section>` : `
      <section class="card shop-panel lottery-panel">
        <div class="pet-stage" style="min-height:220px">
          <div class="pet-emoji lottery-hero">
            ${LOTTERY_QUESTION_POSITIONS.slice(0, 2).map(position => `<span class="lottery-question ${position}">${LOTTERY_QUESTION}</span>`).join('')}
            ${LOTTERY_GIFT}
            ${LOTTERY_QUESTION_POSITIONS.slice(2).map(position => `<span class="lottery-question ${position}">${LOTTERY_QUESTION}</span>`).join('')}
          </div>
        </div>
        <button class="btn" data-action="lottery" style="width:100%;margin-top:18px">开始抽奖 20 积分</button>
      </section>`}
    </section>`;
}
