import { formatPoints, iconSvg, recordTitle, statCard } from './shared.js?v=20261001f';
import { cloudIsBusy, cloudLastEmail, cloudLocalBackup, cloudOverviewMetaText, cloudPendingEmail, cloudStateText, cloudStatus, cloudStatusText } from '../cloud.js?v=20261003d';

function myOverviewCard(section, icon, title, summary, meta, metaLive = '') {
  return `
    <button class="my-entry-card" data-my-section="${section}">
      <span class="my-card-icon ${section}">${icon}</span>
      <strong>${title}</strong>
      <p>${summary}</p>
      <small${metaLive ? ` data-cloud-live="${metaLive}"` : ''}>${meta}</small>
    </button>`;
}

function myDetailShell(title, subtitle, content, extraClass = '', attrs = '') {
  return `
    <section class="card my-detail-card ${extraClass}"${attrs ? ` ${attrs}` : ''}>
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

// 状态行只展示「已同步」或异常提示，不展示「正在同步」——
// 后台每隔几分钟自动同步一次，如果每次都提示在同步，页面会一直闪。
function cloudSyncSummary(status) {
  return cloudStatusText(status);
}

function cloudOverviewMeta(status) {
  return cloudOverviewMetaText(status);
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

  // 登录状态暂时读不到（网络抖动）：显示「正在恢复」，不要弹登录页吓人
  if (status.mode === 'recovering') {
    return `
      <div class="empty-card">
        <strong>正在恢复登录状态</strong>
        <p>网络似乎不太稳定，正在自动重试。这段时间的积分都保存在这台设备上，恢复后会自动补传。</p>
      </div>`;
  }

  // 已登录
  if (status.mode === 'ready') {
    const backup = cloudLocalBackup();
    const syncBusy = Boolean(cloudUi?.busy) || cloudIsBusy(status);
    return `
      <div class="cloud-account">
        <span class="cloud-account-icon">${iconSvg('person')}</span>
        <div>
          <strong data-cloud-live="email">${escapeHtml(status.email || '已登录')}</strong>
          <p data-cloud-live="summary">${escapeHtml(cloudSyncSummary(status))}</p>
        </div>
      </div>
      <div class="cloud-note" data-cloud-live="state" data-cloud-state="${status.error ? 'error' : 'ok'}">${escapeHtml(cloudStateText(status))}</div>
      ${backup ? '<div class="cloud-note">首次登录时云端已有数据，本机原有记录已另存一份备份，需要时可导出查看。</div>' : ''}
      <div class="actions">
        <button class="btn secondary" data-action="cloud-sync" ${syncBusy ? 'disabled' : ''}><span data-cloud-live="sync-btn">${syncBusy ? '同步中…' : '立即同步'}</span></button>
        <button class="btn ghost" data-action="cloud-signout">退出账号</button>
      </div>
      <div class="cloud-note">退出后本机积分和记录仍保留在这台设备上，云端数据也还在原邮箱里。想换邮箱，退出后用新邮箱登录即可。</div>`;
  }

  // 未登录：四个表单共用同一套字段渲染
  const pendingEmail = cloudPendingEmail();
  // 掉线/退出后把上次的邮箱预填好，用户只需输密码就能重登
  const emailField = cloudInput('email', '邮箱', {
    type: 'email',
    placeholder: 'parent@example.com',
    autocomplete: 'username',
    value: pendingEmail || cloudLastEmail()
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
  // 刚退出过账号：告诉用户是哪个邮箱，以及「继续用」还是「换一个」
  const lastEmail = cloudLastEmail();
  // 被服务端收回会话（不是自己点的退出）：必须把「为什么掉线」说清楚，
  // 否则会被下面那条「刚退出的是 xxx」盖住，让人一头雾水。
  const sessionExpired = status.reason === 'session-expired';
  const signedOutNote = sessionExpired
    ? `<div class="cloud-note">${escapeHtml(status.message || '登录状态已失效，重新登录即可继续同步。')}</div>`
    : (lastEmail
      ? `<div class="cloud-note">刚退出的是 ${escapeHtml(lastEmail)}。用同一个邮箱登录可以继续同步；换成别的邮箱登录，就按新账号的规则重新初始化。</div>`
      : (status.message ? `<div class="cloud-note">${escapeHtml(status.message)}</div>` : ''));
  const intro = `
    ${signedOutNote}
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
  const earned = state.records.reduce((sum, record) => sum + Math.max(record.delta || 0, 0), 0);
  const spent = Math.abs(state.records.reduce((sum, record) => sum + Math.min(record.delta || 0, 0), 0));
  const exchangedRewards = state.exchangedRewards || [];
  const cloudState = cloudStatus();

  if (state.mySection === 'cloud') {
    return myDetailShell(
      '账号与同步',
      '',
      cloudSectionBody(cloudState, cloudUi),
      'cloud-detail-host',
      `data-cloud-mode="${cloudState.mode}"`
    );
  }


  if (state.mySection === 'profile') {
    return `
      ${myDetailShell('我的成长档案', '成长积分记录都放在这里，方便家长回看每一次加分和使用。', `
        <div class="stat-row compact">
          ${statCard('star', formatPoints(state.points), '当前积分')}
          ${statCard('trendingUp', `+${formatPoints(earned)}`, '累计加分')}
          ${statCard('gift', exchangedRewards.length, '兑换奖励')}
          ${statCard('sparkles', `-${formatPoints(spent)}`, '累计使用')}
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

  state.mySection = null;
  return `
    <section class="my-overview">
      <div class="my-overview-grid">
        ${myOverviewCard('profile', iconSvg('star'), '成长档案', '查看当前积分、累计加分、累计使用。', `${formatPoints(state.points)} 当前积分`)}
        ${myOverviewCard('cloud', iconSvg('cloud'), '账号与同步', '登录后，平板和手机看到的是同一份积分。', cloudOverviewMeta(cloudState), 'overview-cloud-meta')}
        ${myOverviewCard('redeemed', iconSvg('gift'), '我的兑换', '查看兑换奖励、等待核销和已核销记录。', `${exchangedRewards.length} 个奖励`)}
        ${myOverviewCard('records', iconSvg('checklist'), '积分记录', '查看每一次加分、兑换和抽奖的明细。', `${state.records.length} 条记录`)}
      </div>
    </section>`;
}
