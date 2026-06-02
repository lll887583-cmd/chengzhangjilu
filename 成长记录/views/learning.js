import { ADDITION_MODES } from '../data.js';

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

function additionModeCard(mode) {
  const speakText = `${mode.label}，${mode.seconds}秒，完成10题`;
  const modeIcons = {
    easy: {
      tone: 'easy',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6c5.19 0 9.4 4.21 9.4 9.4s-4.21 9.4-9.4 9.4-9.4-4.21-9.4-9.4 4.21-9.4 9.4-9.4Zm-3.15 6.3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm6.3 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm1.6 4.53H7.25a4.78 4.78 0 0 0 9.5 0Z" fill="currentColor"></path></svg>'
    },
    standard: {
      tone: 'standard',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2c2.76 0 5.26 1.12 7.07 2.93A9.97 9.97 0 0 1 22 12c0 2.76-1.12 5.26-2.93 7.07A9.97 9.97 0 0 1 12 22a9.97 9.97 0 0 1-7.07-2.93A9.97 9.97 0 0 1 2 12c0-2.76 1.12-5.26 2.93-7.07A9.97 9.97 0 0 1 12 2Zm0 2.4A7.6 7.6 0 1 0 12 19.6 7.6 7.6 0 0 0 12 4.4Zm.36 2.74c.6 0 1.08.45 1.15 1.03l.01.17v3.05l1.98 1.2c.5.3.68.93.42 1.44l-.1.16a1.17 1.17 0 0 1-1.43.32l-.16-.08-2.56-1.55a1.18 1.18 0 0 1-.56-.84l-.02-.17V8.34c0-.66.54-1.2 1.2-1.2Z" fill="currentColor"></path></svg>'
    },
    challenge: {
      tone: 'challenge',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.4 14.45 7.37l5.48.8-3.97 3.87.94 5.46L12 14.93 7.1 17.5l.94-5.46L4.07 8.17l5.48-.8L12 2.4Z" fill="currentColor"></path></svg>'
    }
  };
  const modeIcon = modeIcons[mode.id] || modeIcons.easy;
  return `
    <article class="addition-mode-card" data-speak="${speakText}" tabindex="0" aria-label="${speakText}">
      <span class="addition-mode-icon ${modeIcon.tone}" aria-hidden="true">${modeIcon.icon}</span>
      <strong>${mode.label}</strong>
      <span>${mode.seconds} 秒 · 10 题</span>
      <button class="btn ghost addition-mode-cta" type="button" data-addition-mode="${mode.id}">开始挑战</button>
    </article>`;
}

function additionOptionButton(option, game) {
  const isAnswered = game.currentSelection !== null;
  const isSelected = game.currentSelection === option;
  const isCorrect = option === game.questions[game.currentIndex].answer;
  const tone = !isAnswered
    ? ''
    : isCorrect
      ? 'is-correct'
      : isSelected
        ? 'is-wrong'
        : 'is-idle';

  return `
    <button class="addition-option ${tone}" type="button" data-addition-option="${option}" ${isAnswered ? 'disabled' : ''}>
      <span>${option}</span>
    </button>`;
}

function additionResultCopy(game) {
  if (game.correctCount === game.questions.length) {
    return '10 题全对，太棒啦！';
  }
  if (game.correctCount >= 8) {
    return '做得很好，再来一轮会更棒。';
  }
  if (game.correctCount >= 5) {
    return '继续加油，已经越来越熟练了。';
  }
  return '没关系，再来一组就会更顺手。';
}

export function additionView(state) {
  const game = state.additionGame;
  const modeEntries = Object.values(ADDITION_MODES);

  if (!game) {
    return `
      <section class="addition-page">
        <section class="card addition-start-card">
          <div class="addition-mode-grid">
            ${modeEntries.map(mode => additionModeCard(mode)).join('')}
          </div>
          <div class="addition-reward-note">
            <strong>积分规则</strong>
            <p>完成一轮加 5 分，每答对 1 题再加 1 分，10 题全对额外再加 2 分。</p>
          </div>
        </section>
      </section>`;
  }

  const mode = ADDITION_MODES[game.mode] || ADDITION_MODES.easy;
  const question = game.questions[game.currentIndex];
  const remainingSeconds = Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
  const answeredCount = Math.min(game.questions.length, game.currentIndex + (game.status === 'finished' ? 0 : 1));

  if (game.status === 'finished') {
    const spentSeconds = Math.max(0, Math.round((game.finishedAt - game.startedAt) / 1000));
    return `
      <section class="addition-page">
        <section class="card addition-result-card">
          <div class="section-head addition-head">
            <div>
              <h2>${game.completionReason === 'timeout' ? '时间到啦' : '答题完成'}</h2>
              <p>${additionResultCopy(game)}</p>
            </div>
          </div>
          <div class="addition-result-grid">
            <article class="stat-card">
              <div>
                <strong>${game.correctCount} / 10</strong>
                <small>答对题数</small>
              </div>
            </article>
            <article class="stat-card">
              <div>
                <strong>${spentSeconds} 秒</strong>
                <small>${mode.label}</small>
              </div>
            </article>
            <article class="stat-card">
              <div>
                <strong>+${game.awardedPoints}</strong>
                <small>本轮积分</small>
              </div>
            </article>
          </div>
          <div class="addition-result-actions">
            <button class="btn secondary" type="button" data-addition-restart="${mode.id}">再来一组</button>
            <button class="btn ghost" type="button" data-addition-reset>换个模式</button>
          </div>
        </section>
      </section>`;
  }

  return `
    <section class="addition-page">
      <section class="card addition-quiz-card">
        <div class="addition-question-wrap">
          <p class="addition-question-label">请选出正确答案</p>
          <div class="addition-question" data-addition-question>${question.a} + ${question.b} = <span class="addition-question-mark">?</span></div>
        </div>
        <div class="addition-options" role="group" aria-label="加法选项" data-addition-options>
          ${question.options.map(option => additionOptionButton(option, game)).join('')}
        </div>
        <p class="addition-footnote">完成一轮加 5 分，每答对 1 题再加 1 分。</p>
      </section>
    </section>`;
}
