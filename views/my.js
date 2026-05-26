import { petView } from './pet.js';
import { getPetStatus, iconSvg, recordTitle, statCard } from './shared.js';

function myOverviewCard(section, icon, title, summary, meta) {
  return `
    <button class="my-entry-card" data-my-section="${section}">
      <span class="my-card-icon ${section}">${icon}</span>
      <strong>${title}</strong>
      <p>${summary}</p>
      <small>${meta}</small>
    </button>`;
}

function myDetailShell(title, subtitle, content, extraClass = '') {
  return `
    <section class="card my-detail-card ${extraClass}">
      <div class="section-head my-back-row">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <button class="btn ghost" data-action="my-back">返回</button>
      </div>
      ${content}
    </section>`;
}

function redemptionCard(reward) {
  const isWrittenOff = Boolean(reward.redeemedAt);
  const statusText = isWrittenOff
    ? ` · ${new Date(reward.redeemedAt).toLocaleString('zh-CN')} 已核销`
    : ' · 待核销';

  const sourceText = reward.source === 'lottery'
    ? '抽奖获得'
    : `使用 ${reward.cost} 积分`;

  return `
    <article class="redeemed-card ${isWrittenOff ? 'is-written-off' : ''}">
      <div class="redeemed-icon">${iconSvg(reward.icon)}</div>
      <div>
        <h3>${reward.name}</h3>
        <p>${new Date(reward.time).toLocaleString('zh-CN')} · ${sourceText}${statusText}</p>
      </div>
      <button class="btn ${isWrittenOff ? 'redeemed-btn' : 'writeoff-btn'}" ${isWrittenOff ? 'disabled' : `data-write-off="${reward.exchangeId}"`}>${isWrittenOff ? '已核销' : '核销'}</button>
    </article>`;
}

export function myView(state) {
  const status = getPetStatus(state.pet);
  const earned = state.records.reduce((sum, record) => sum + Math.max(record.delta || 0, 0), 0);
  const spent = Math.abs(state.records.reduce((sum, record) => sum + Math.min(record.delta || 0, 0), 0));
  const exchangedRewards = state.exchangedRewards || [];

  if (state.mySection === 'pet') {
    return myDetailShell('宠物馆', '云宠物和宠物图鉴搬到这里了，原来的领养、互动和详情逻辑保持不变。', petView(state), 'pet-detail-host');
  }

  if (state.mySection === 'profile') {
    return myDetailShell('我的成长档案', '成长积分记录都放在这里，方便家长回看每一次获得和使用。', `
      <div class="stat-row compact">
        ${statCard('star', state.points, '当前积分')}
        ${statCard('trendingUp', `+${earned}`, '累计获得')}
        ${statCard('gift', exchangedRewards.length, '兑换奖励')}
        ${statCard('sparkles', `-${spent}`, '累计使用')}
        ${statCard('pets', status.label, '宠物馆状态')}
      </div>
      <div class="actions"><button class="btn ghost" data-action="export">导出备份</button><button class="btn ghost" data-action="reset">重置 Demo</button><button class="btn danger-soft" data-action="logout">退出登录</button></div>
    `);
  }

  if (state.mySection === 'redeemed') {
    return myDetailShell('我的兑换', `积分商城换取的奖励都会保存在这里，共 ${exchangedRewards.length} 个。`, exchangedRewards.length ? `
      <div class="redeemed-list">${exchangedRewards.map(redemptionCard).join('')}</div>
    ` : `
      <div class="empty-card">
        <strong>还没有兑换记录</strong>
        <p>去积分商城兑换后，会自动出现在这里。</p>
        <button class="btn secondary" data-tab-jump="shop">去兑换商城</button>
      </div>
    `);
  }

  if (state.mySection === 'records') {
    return myDetailShell('成长积分记录', '每一次获得和使用积分，都会按时间放在这里。', `
      <div class="records-list">${state.records.map(record => `
        <div class="record-card">
          <h3>${recordTitle(record.text)}</h3>
          <p>${new Date(record.time).toLocaleString('zh-CN')} ${record.delta ? ` · ${record.delta > 0 ? '+' : ''}${record.delta} 积分` : ''}</p>
        </div>
      `).join('')}</div>
    `);
  }

  state.mySection = null;
  return `
    <section class="my-overview">
      <div class="my-overview-grid">
        ${myOverviewCard('profile', iconSvg('star'), '成长档案', '查看当前积分、累计获得、累计使用和宠物状态。', `${state.points} 当前积分`)}
        ${myOverviewCard('pet', iconSvg('pets'), '宠物馆', '进入云宠物和宠物图鉴，继续领养、互动和查看详情。', status.label)}
        ${myOverviewCard('redeemed', iconSvg('gift'), '我的兑换', '查看兑换奖励、等待核销和已核销记录。', `${exchangedRewards.length} 个奖励`)}
        ${myOverviewCard('records', iconSvg('checklist'), '积分记录', '查看每一次获得、兑换、抽奖和照顾宠物的明细。', `${state.records.length} 条记录`)}
      </div>
    </section>`;
}
