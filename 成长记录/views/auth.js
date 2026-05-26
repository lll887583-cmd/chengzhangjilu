export function authView(errorMessage = '') {
  return `
    <section class="auth-page">
      <div class="auth-logo" aria-hidden="true">
        <img src="./assets/logo.png" alt="成长记录" />
      </div>
      <section class="card auth-card">
        <form class="auth-form" data-login-form>
          <input name="account" type="text" inputmode="text" autocomplete="username" placeholder="输入账号" aria-label="账号" required>
          <input name="password" type="password" inputmode="numeric" autocomplete="current-password" placeholder="输入密码" aria-label="密码" required>
          <p class="auth-hint">演示账号：a　密码：111111</p>
          ${errorMessage ? `<p class="auth-error">${errorMessage}</p>` : ''}
          <button class="btn secondary" type="submit">登录</button>
        </form>
      </section>
    </section>`;
}
