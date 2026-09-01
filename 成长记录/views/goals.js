const GOAL_SECTIONS = [
  {
    title: '语言文字与阅读表达',
    items: ['识字量：累计掌握 1200 个基础核心汉字。', '古诗：熟练背诵 5–10 首经典简单古诗。', '表达：看图说完整句子，能简单复述一个小故事。']
  },
  {
    title: '汉语拼音',
    items: ['认读并默写 23 个声母、24 个韵母、16 个整体认读音节。', '顺畅拼读简单的双拼和三拼音节。']
  },
  {
    title: '书写与控笔',
    items: ['通过直线、曲线、画圈等练习，建立控笔稳定性。', '规范书写数字 0–9、自己的名字。', '掌握“一、二、人、口”等高频汉字的笔顺。']
  },
  {
    title: '数学计算与数理逻辑',
    items: ['掌握 1–100 的正数、倒数，并能比较数字大小。', '熟练掌握 20 以内的加减法。', '会进行物品分类、图形或数字找规律，以及长短、轻重比较。']
  },
  {
    title: '空间、几何与生活数学',
    items: ['辨认并准确命名圆形、正方形、长方形、三角形等图形。', '认识时钟的整点与半点。', '准确辨认人民币的各种面值。']
  }
];

export function goalsView() {
  return `<section class="goals-page"><div class="goals-intro"><h2>幼小衔接目标</h2><p>一起积累能力，轻松做好入学准备。</p></div><div class="goals-grid">${GOAL_SECTIONS.map(section => `<article class="card goal-card"><h3>${section.title}</h3><ul>${section.items.map(item => `<li>${item}</li>`).join('')}</ul></article>`).join('')}</div></section>`;
}
