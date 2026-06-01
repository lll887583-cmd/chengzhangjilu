function colorClass(color) {
  return ['red', 'yellow', 'green'].includes(color) ? color : 'red';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function literacyCard(item) {
  const tone = colorClass(item.color);
  const safeText = escapeHtml(item.text);
  return `
    <article class="literacy-card" role="button" tabindex="0" data-literacy-preview="${item.id}" aria-label="查看${safeText}字卡">
      <button class="rule-delete" type="button" data-literacy-delete="${item.id}" aria-label="删除${safeText}">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18.3 5.71a1 1 0 0 0-1.42 0L12 10.59 7.12 5.7A1 1 0 1 0 5.7 7.12L10.59 12 5.7 16.88a1 1 0 1 0 1.41 1.42L12 13.41l4.88 4.89a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41Z" fill="currentColor"></path></svg>
      </button>
      <span class="literacy-dot ${tone}" aria-hidden="true"></span>
      <strong>${safeText}</strong>
      <button class="literacy-more" type="button" data-literacy-more="${item.id}" aria-label="更多操作">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0-1.42 0Z" fill="currentColor"></path></svg>
      </button>
    </article>`;
}

function literacyAddCard() {
  return `
    <button class="literacy-card literacy-card-add" type="button" data-literacy-create aria-label="新增汉字卡">
      <span class="rule-card-add-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" fill="currentColor"></path></svg>
      </span>
    </button>`;
}

export function literacyView(state) {
  const items = state.literacyItems || [];

  return `
    <section class="literacy-page">
      <section class="literacy-grid">
        ${items.map(literacyCard).join('')}
        ${literacyAddCard()}
      </section>
    </section>`;
}
