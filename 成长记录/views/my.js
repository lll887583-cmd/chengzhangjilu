import { petView } from './pet.js';
import { formatPoints, getPetStatus, iconSvg, recordTitle, sectionSwitch, statCard } from './shared.js';
import { cloudLocalBackup, cloudPendingEmail, cloudStatus } from '../cloud.js?v=20260930b';

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
          ${subtitle ? '' : ''}
        </div>
        <button class="btn ghost" data-action="my-back">返回</button>
      </div>
      ${content}
    </section>`;
}

function startOfDay(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatBucketLabel(view, date) {
  if (view === 'year') return `${date.getMonth() + 1}月`;
  if (view === 'month') return `${date.getDate()}日`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildPointsBoard(state, view = 'week') {
  const today = startOfDay(Date.now());
  const buckets = [];
  const earnedRecords = (state.records || []).filter(record => (record.delta || 0) > 0);

  if (view === 'year') {
    const year = today.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const date = new Date(year, month, 1);
      buckets.push({
        key: `${year}-${month + 1}`,
        label: formatBucketLabel(view, date),
        total: 0,
        year,
        month
      });
    }
    earnedRecords.forEach(record => {
      const date = new Date(record.time);
      if (date.getFullYear() !== year) return;
      buckets[date.getMonth()].total += record.delta || 0;
    });
  } else if (view === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      buckets.push({
        key: `${year}-${month + 1}-${day}`,
        label: formatBucketLabel(view, date),
        total: 0,
        year,
        month,
        day
      });
    }
    earnedRecords.forEach(record => {
      const date = new Date(record.time);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      buckets[date.getDate() - 1].total += record.delta || 0;
    });
  } else {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      buckets.push({
        key: date.toISOString().slice(0, 10),
        label: formatBucketLabel('week', date),
        total: 0,
        date
      });
    }
    earnedRecords.forEach(record => {
      const date = startOfDay(record.time);
      if (date < start || date > today) return;
      const index = Math.round((date.getTime() - start.getTime()) / 86400000);
      if (buckets[index]) buckets[index].total += record.delta || 0;
    });
  }

  const maxTotal = Math.max(...buckets.map(item => item.total), 0);
  const chartWidth = Math.max(640, buckets.length * 56);
  const chartHeight = 220;
  const padX = 28;
  const padY = 24;
  const usableWidth = chartWidth - padX * 2;
  const usableHeight = chartHeight - padY * 2;
  const stepX = buckets.length > 1 ? usableWidth / (buckets.length - 1) : 0;
  const points = buckets.map((item, index) => {
    const x = padX + stepX * index;
    const y = chartHeight - padY - (maxTotal > 0 ? (item.total / maxTotal) * usableHeight : 0);
    return { ...item, x, y };
  });
  const polyline = points.map(point => `${point.x},${point.y}`).join(' ');
  const totalEarned = buckets.reduce((sum, item) => sum + item.total, 0);
  const topBucket = buckets.reduce((best, item) => item.total > best.total ? item : best, buckets[0] || { label: '-', total: 0 });
  const activeDays = buckets.filter(item => item.total > 0).length;
  const viewText = view === 'year' ? '年视图' : view === 'month' ? '月视图' : '周视图';

  return {
    viewText,
    buckets,
    points,
    polyline,
    maxTotal,
    totalEarned,
    topBucket,
    activeDays
  };
}

function pointsBoardSection(state) {
  const boardView = state.pointsBoardView || 'week';
  const board = buildPointsBoard(state, boardView);
  const switchHtml = sectionSwitch([
    { value: 'week', label: '周视图' },
    { value: 'month', label: '月视图' },
    { value: 'year', label: '年视图' }
  ], boardView, 'points-board-view', 'section-switch--header section-switch--header-triple');

  return myDetailShell('积分看板', '查看积分加分总数的折线趋势。', `
    <div class="points-board-head">
      ${switchHtml}
    </div>
    <div class="points-board-summary">
      ${statCard('trendingUp', `+${formatPoints(board.totalEarned)}`, `${board.viewText}加分总数`)}
      ${statCard('star', board.maxTotal ? `+${formatPoints(board.topBucket.total)}` : '+0', `峰值：${board.topBucket.label}`)}
      ${statCard('checklist', board.activeDays, '有积分的时间点')}
    </div>
    <section class="points-board-chart card">
      <div class="points-board-chart-head">
        <strong>${board.viewText}</strong>
        <span>只统计加分记录</span>
      </div>
      <div class="points-board-scroll">
        <div class="points-board-track" style="width:${board.points.at(-1)?.x + 28 || 640}px;">
          <svg viewBox="0 0 ${board.points.at(-1)?.x + 28 || 640} 220" class="points-board-svg" aria-label="${board.viewText}积分折线图" role="img">
            <line x1="28" y1="196" x2="${board.points.at(-1)?.x + 28 || 612}" y2="196" class="points-board-axis"></line>
            ${board.points.map(point => `<line x1="${point.x}" y1="196" x2="${point.x}" y2="${point.y}" class="points-board-guide"></line>`).join('')}
            <polyline points="${board.polyline}" class="points-board-line"></polyline>
            ${board.points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="6" class="points-board-dot"></circle>`).join('')}
          </svg>
          <div class="points-board-labels" style="grid-template-columns: repeat(${board.buckets.length}, minmax(44px, 1fr));">
            ${board.buckets.map(bucket => `<span>${bucket.label}</span>`).join('')}
          </div>
          <div class="points-board-values" style="grid-template-columns: repeat(${board.buckets.length}, minmax(44px, 1fr));">
            ${board.buckets.map(bucket => `<span>+${bucket.total}</span>`).join('')}
          </div>
        </div>
      </div>
    </section>
  `, 'points-board-detail');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function cloudInput(name, label, options = {}) {
  const {
    type = 'text',
    placeholder = '',
    autocomplete = '',
    value = ''
  } = options;
  return `
    <label class="cloud-field">
      <span>${label}</span>
      <input type="${type}" name="${name}"
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
        ${type === 'email' ? 'inputmode="email" autocapitalize="off" spellcheck="false"' : ''}
        required placeholder="${placeholder}" value="${escapeHtml(value)}" />
    </label>`;
}

function cloudSyncSummary(status) {
  if (status.syncing) return '正在同步…';
  const timeText = status.lastSyncedAt
    ? `上次同步：${new Date(status.lastSyncedAt).toLocaleString('zh-CN')}`
    : '还没有同步过';
  return status.pendingCount ? `${timeText} · ${status.pendingCount} 条待同步` : timeText;
}

function cloudOverviewMeta(status) {
  if (status.mode === 'ready') return '已开启同步';
  if (status.mode === 'local-only') return '当前地址不可用';
  if (status.mode === 'error') return '暂不可用';
  return '未开启';
}

function cloudSectionBody(status, cloudUi) {
  const busy = Boolean(cloudUi?.busy);
  const mode = cloudUi?.mode || 'password';

  if (status.mode === 'checking') {
    return '<div class="cloud-note">正在准备同步组件…</div>';
  }

  // 备用地址或不支持的环境：说清楚原因，不让人以为功能坏了
  if (status.mode === 'local-only' || status.mode === 'error') {
    return `
      <div class="empty-card">
        <strong>${status.mode === 'error' ? '同步暂时不可用' : '当前地址不支持账号同步'}</strong>
        <p>${escapeHtml(status.message || '积分会继续保存在这台设备上，其他功能不受影响。')}</p>
        <p>换成发布后的正式地址打开，就可以登录并同步了。</p>
      </div>`;
  }

  // 已登录
  if (status.mode === 'ready') {
    const backup = cloudLocalBackup();
    return `
      <div class="cloud-account">
        <span class="cloud-account-icon">${iconSvg('person')}</span>
        <div>
          <strong>${escapeHtml(status.email || '已登录')}</strong>
          <p>${escapeHtml(cloudSyncSummary(status))}</p>
        </div>
      </div>
      ${status.message ? `<div class="cloud-note">${escapeHtml(status.message)}</div>` : ''}
      ${backup ? '<div class="cloud-note">首次登录时云端已有数据，本机原有记录已另存一份备份，需要时可导出查看。</div>' : ''}
      <div class="actions">
        <button class="btn secondary" data-action="cloud-sync" ${busy || status.syncing ? 'disabled' : ''}>${status.syncing ? '同步中…' : '立即同步'}</button>
        <button class="btn ghost" data-action="cloud-signout">退出账号</button>
      </div>`;
  }

  // 未登录：四个表单共用同一套字段渲染
  const pendingEmail = cloudPendingEmail();
  const emailField = cloudInput('email', '邮箱', {
    type: 'email',
    placeholder: 'parent@example.com',
    autocomplete: 'username',
    value: pendingEmail
  });
  const codeField = cloudInput('code', '邮箱验证码', {
    placeholder: '邮箱里收到的 6 位数字',
    autocomplete: 'one-time-code'
  });
  const sendButton = purpose => `
    <button class="btn ghost cloud-send" type="button" data-cloud-send="${purpose}">获取验证码</button>`;
  const submitButton = label => `
    <button class="btn cloud-submit" type="submit" ${busy ? 'disabled' : ''}>${busy ? '处理中…' : label}</button>`;
  const links = items => `
    <div class="cloud-links">
      ${items.map(([value, label]) => `<button class="cloud-link" type="button" data-cloud-mode="${value}">${label}</button>`).join('')}
    </div>`;
  const intro = `
    <div class="cloud-intro">
      <p>用邮箱登录后，孩子在平板上攒的积分会自动同步到云端。用同一个邮箱在手机上登录，就能看到当前积分。</p>
      <p>登录是可选的：不登录也照常记录，数据保存在这台设备上。</p>
    </div>`;

  if (mode === 'signup') {
    return `${intro}
      <form class="cloud-form" data-cloud-form="signup">
        ${emailField}
        ${sendButton('signup')}
        ${codeField}
        ${cloudInput('password', '设置密码', { type: 'password', placeholder: '用于以后直接登录', autocomplete: 'new-password' })}
        ${submitButton('注册并开始同步')}
      </form>
      ${links([['password', '返回登录']])}`;
  }

  if (mode === 'reset') {
    return `${intro}
      <form class="cloud-form" data-cloud-form="reset">
        ${emailField}
        ${sendButton('reset')}
        ${codeField}
        ${cloudInput('password', '新密码', { type: 'password', placeholder: '重新设置一个密码', autocomplete: 'new-password' })}
        ${submitButton('重设密码')}
      </form>
      ${links([['password', '返回登录']])}`;
  }

  if (mode === 'otp') {
    return `${intro}
      <form class="cloud-form" data-cloud-form="otp">
        ${emailField}
        ${sendButton('login')}
        ${codeField}
        ${submitButton('用验证码登录')}
      </form>
      ${links([['password', '改用密码登录'], ['signup', '注册新账号']])}`;
  }

  return `${intro}
    <form class="cloud-form" data-cloud-form="password">
      ${emailField}
      ${cloudInput('password', '密码', { type: 'password', placeholder: '账号密码', autocomplete: 'current-password' })}
      ${submitButton('登录')}
    </form>
    ${links([['otp', '用邮箱验证码登录'], ['signup', '注册新账号'], ['reset', '忘记密码']])}`;
}

function redemptionCard(reward) {
  const isWrittenOff = Boolean(reward.redeemedAt);
  const statusText = isWrittenOff
    ? ` · ${new Date(reward.redeemedAt).toLocaleString('zh-CN')} 已核销`
    : ' · 待核销';

  const sourceText = reward.source === 'lottery'
    ? '抽奖奖励'
    : `使用 ${formatPoints(reward.cost)} 积分`;

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

export function myView(state, cloudUi = {}) {
  const status = getPetStatus(state.pet);
  const earned = state.records.reduce((sum, record) => sum + Math.max(record.delta || 0, 0), 0);
  const spent = Math.abs(state.records.reduce((sum, record) => sum + Math.min(record.delta || 0, 0), 0));
  const exchangedRewards = state.exchangedRewards || [];
  const cloudState = cloudStatus();

  if (state.mySection === 'cloud') {
    return myDetailShell('账号与同步', '', cloudSectionBody(cloudState, cloudUi), 'cloud-detail-host');
  }

  if (state.mySection === 'pet') {
    return myDetailShell('宠物馆', '云宠物和宠物图鉴搬到这里了，原来的领养、互动和详情逻辑保持不变。', petView(state), 'pet-detail-host');
  }

  if (state.mySection === 'profile') {
    return `
      ${myDetailShell('我的成长档案', '成长积分记录都放在这里，方便家长回看每一次加分和使用。', `
        <div class="stat-row compact">
          ${statCard('star', formatPoints(state.points), '当前积分')}
          ${statCard('trendingUp', `+${formatPoints(earned)}`, '累计加分')}
          ${statCard('gift', exchangedRewards.length, '兑换奖励')}
          ${statCard('sparkles', `-${formatPoints(spent)}`, '累计使用')}
          ${statCard('pets', status.label, '宠物馆状态')}
        </div>
      `)}
      <div class="actions"><button class="btn ghost" data-action="export">导出数据</button><button class="btn ghost" data-action="import">导入数据</button><button class="btn danger-soft" data-action="reset">重置</button></div>
    `;
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
    return myDetailShell('成长积分记录', '每一次加分和使用积分，都会按时间放在这里。', `
      <div class="records-list">${state.records.map(record => `
        <div class="record-card">
          <h3>${recordTitle(record.text)}</h3>
          <p>${new Date(record.time).toLocaleString('zh-CN')} ${record.delta ? ` · ${record.delta > 0 ? '+' : ''}${formatPoints(record.delta)} 积分` : ''}</p>
          <button class="record-revert-button" type="button" data-revert-record="${record.id || record.time}" aria-label="撤回操作">?</button>
        </div>
      `).join('')}</div>
    `);
  }

  if (state.mySection === 'dashboard') {
    return pointsBoardSection(state);
  }

  state.mySection = null;
  return `
    <section class="my-overview">
      <div class="my-overview-grid">
        ${myOverviewCard('profile', iconSvg('star'), '成长档案', '查看当前积分、累计加分、累计使用和宠物状态。', `${formatPoints(state.points)} 当前积分`)}
        ${myOverviewCard('cloud', iconSvg('cloud'), '账号与同步', '登录后，平板和手机看到的是同一份积分。', cloudOverviewMeta(cloudState))}
        ${myOverviewCard('redeemed', iconSvg('gift'), '我的兑换', '查看兑换奖励、等待核销和已核销记录。', `${exchangedRewards.length} 个奖励`)}
        ${myOverviewCard('dashboard', iconSvg('trendingUp'), '积分看板', '查看积分加分总数的年/月/周折线趋势。', '年 / 月 / 周')}
        ${myOverviewCard('records', iconSvg('checklist'), '积分记录', '查看每一次加分、兑换、抽奖和照顾宠物的明细。', `${state.records.length} 条记录`)}
        ${myOverviewCard('pet', iconSvg('pets'), '宠物馆', '进入云宠物和宠物图鉴，继续领养、互动和查看详情。', status.label)}
      </div>
    </section>`;
}
