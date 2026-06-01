function gridCell(value, selectedValues, datasetName, ariaSuffix = '') {
  const isSelected = selectedValues.has(value);
  return `
    <button
      class="number-board-cell ${isSelected ? 'selected' : ''}"
      type="button"
      data-${datasetName}="${value}"
      aria-pressed="${isSelected ? 'true' : 'false'}"
      aria-label="${value}${ariaSuffix}${isSelected ? '，已选中' : '，未选中'}">
      <span>${value}</span>
    </button>`;
}

function gridFillers(cellCount, columns) {
  const remainder = cellCount % columns;
  const fillerCount = remainder === 0 ? 0 : columns - remainder;
  return Array.from({ length: fillerCount }, () => '<span class="number-board-filler" aria-hidden="true"></span>').join('');
}

function wordCardFontSize(text) {
  const length = String(text || '').trim().length;
  if (length <= 4) return 32;
  if (length <= 6) return 30;
  if (length <= 8) return 28;
  if (length <= 10) return 26;
  return 24;
}

function wordCard(item) {
  const tone = ['red', 'yellow', 'green'].includes(item.color) ? item.color : 'red';
  const safeText = String(item.text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const fontSize = wordCardFontSize(item.text);

  return `
    <article class="literacy-card word-card" role="button" tabindex="0" data-word-preview="${item.id}" aria-label="查看${safeText}单词卡">
      <button class="rule-delete" type="button" data-word-delete="${item.id}" aria-label="删除${safeText}">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M18.3 5.71a1 1 0 0 0-1.42 0L12 10.59 7.12 5.7A1 1 0 1 0 5.7 7.12L10.59 12 5.7 16.88a1 1 0 1 0 1.41 1.42L12 13.41l4.88 4.89a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41Z" fill="currentColor"></path></svg>
      </button>
      <span class="literacy-dot ${tone}" aria-hidden="true"></span>
      <strong style="font-size:${fontSize}px">${safeText}</strong>
      <button class="literacy-more" type="button" data-word-more="${item.id}" aria-label="编辑${safeText}单词卡">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.58-4.58a1 1 0 0 0 0-1.42l-4.58-4.58a1 1 0 0 0-1.42 0Z" fill="currentColor"></path></svg>
      </button>
    </article>`;
}

function wordAddCard() {
  return `
    <button class="literacy-card literacy-card-add word-card-add" type="button" data-word-create aria-label="新增英文单词卡">
      <span class="rule-card-add-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" fill="currentColor"></path></svg>
      </span>
    </button>`;
}

export function pinyinView(state) {
  const selectedValues = new Set(state.pinyinSelections || []);
  const cells = [
    'a', 'o', 'e', 'i', 'u', 'ü',
    'b', 'p', 'm', 'f', 'd', 't',
    'n', 'l', 'g', 'k', 'h', 'j',
    'q', 'x', 'zh', 'ch', 'sh', 'r',
    'z', 'c', 's', 'y', 'w', 'ai',
    'ei', 'ao', 'ou', 'an', 'en', 'ang',
    'eng', 'ong', 'er', 'ie', 'ui', 'iu'
  ];

  return `
    <section class="numbers-page">
      <section class="numbers-grid learning-grid" aria-label="拼音网格">
        ${cells.map(value => gridCell(value, selectedValues, 'pinyin-cell', '，拼音')).join('')}
        ${gridFillers(cells.length, 6)}
      </section>
    </section>`;
}

export function lettersView(state) {
  const selectedValues = new Set(state.letterSelections || []);
  const cells = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

  return `
    <section class="numbers-page">
      <section class="numbers-grid learning-grid letters-grid" aria-label="英文字母网格">
        ${cells.map(value => gridCell(value, selectedValues, 'letter-cell', '，英文字母')).join('')}
        ${gridFillers(cells.length, 4)}
      </section>
    </section>`;
}

export function wordsView(state) {
  const items = state.wordItems || [];

  return `
    <section class="literacy-page">
      <section class="literacy-grid words-grid">
        ${items.map(wordCard).join('')}
        ${wordAddCard()}
      </section>
    </section>`;
}
