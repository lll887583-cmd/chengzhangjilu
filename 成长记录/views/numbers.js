function numberCell(value, selectedValues) {
  const isSelected = selectedValues.has(value);
  return `
    <button
      class="number-board-cell ${isSelected ? 'selected' : ''}"
      type="button"
      data-number-cell="${value}"
      aria-pressed="${isSelected ? 'true' : 'false'}"
      aria-label="${value}${isSelected ? '，已选中' : '，未选中'}">
      <span>${value}</span>
    </button>`;
}

export function numbersView(state) {
  const selectedValues = new Set(state.numberBoardSelections || []);

  return `
    <section class="numbers-page">
      <section class="numbers-grid" aria-label="1 到 100 数字网格">
        ${Array.from({ length: 100 }, (_, index) => numberCell(index + 1, selectedValues)).join('')}
      </section>
    </section>`;
}
