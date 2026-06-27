// Central config for content that changes often.
// Pet IP lives in pets.js; point/reward/default app config stays here.
export { PETS } from './pets.js';

export const POINT_RULES = [
  ['画画', 3, '', 'creative'],
  ['粘土手工', 5, '', 'creative'],
  ['11点入睡', 6, '', 'habit'],
  ['学习汉字', 8, '', 'study'],
  ['学习数学', 8, '', 'study'],
  ['完成学校作业', 8, '', 'study'],
  ['打卡英语', 10, '', 'study'],
  ['练字', 10, '', 'study']
];

export const DEDUCT_RULES = [
  ['不好好吃饭', 3, ''],
  ['晚睡', 5, ''],
  ['无理取闹', 6, ''],
  ['骂人', 8, ''],
  ['丢东西', 10, ''],
  ['打人', 15, '']
];

export const REWARDS = [
  { id: 'snacks', icon: 'cookie', name: '买 2 个零食', cost: 40 },
  { id: 'toy', icon: 'toys', name: '买 1 个玩具', cost: 60 },
  { id: 'kfc', icon: 'restaurant', name: '吃肯德基', cost: 80 },
  { id: 'aeon', icon: 'celebration', name: '去永旺玩', cost: 90 },
  { id: 'tv', icon: 'tv', name: '看 40 分钟电视', cost: 100 },
  { id: 'game', icon: 'game', name: '玩 30 分钟游戏', cost: 120 },
  { id: 'all-star-park', icon: 'celebration', name: '全明星公园', cost: 450 },
  { id: 'rainbow-park', icon: 'celebration', name: '彩虹乐园', cost: 350 }
];

export const LOTTERY = [
  { name: '加 10 积分', weight: 42, type: 'points', points: 10, icon: 'star' },
  { name: '操场锻炼 1 次', weight: 23, type: 'reward', icon: 'celebration' },
  { name: '买 2 个小零食', weight: 20, type: 'reward', icon: 'cookie' },
  { name: '今日净积分双倍卡', weight: 1, type: 'boost', multiplier: 2, icon: 'star' }
];

export const DEFAULT_PLANS = [
  { title: '读 15 分钟中文', points: 6, category: 'study', planType: 'single' },
  { title: '口算 10 题', points: 8, category: 'study', planType: 'single' },
  { title: '英语听读打卡', points: 8, category: 'study', planType: 'single' }
];

export const ADDITION_MODES = {
  easy: { id: 'easy', label: '轻松模式', seconds: 120 },
  standard: { id: 'standard', label: '标准模式', seconds: 90 },
  challenge: { id: 'challenge', label: '挑战模式', seconds: 60 }
};

export const DEFAULT_WORD_ITEMS = [
  { id: 'word-bus', text: 'bus', translation: '公共汽车', color: 'red' },
  { id: 'word-car', text: 'car', translation: '小汽车', color: 'red' },
  { id: 'word-bike', text: 'bike', translation: '自行车', color: 'red' },
  { id: 'word-motorbike', text: 'motorbike', translation: '摩托车', color: 'red' },
  { id: 'word-truck', text: 'truck', translation: '卡车', color: 'red' },
  { id: 'word-raining', text: 'raining', translation: '下雨天', color: 'red' },
  { id: 'word-sunny', text: 'sunny', translation: '晴天', color: 'red' },
  { id: 'word-snowing', text: 'snowing', translation: '下雪天', color: 'red' },
  { id: 'word-hot', text: 'hot', translation: '热的', color: 'red' },
  { id: 'word-cold', text: 'cold', translation: '冷的', color: 'red' },
  { id: 'word-chicken', text: 'chicken', translation: '鸡肉', color: 'red' },
  { id: 'word-noodles', text: 'noodles', translation: '面条', color: 'red' },
  { id: 'word-soup', text: 'soup', translation: '汤', color: 'red' },
  { id: 'word-hungry', text: 'hungry', translation: '饿的', color: 'red' },
  { id: 'word-pillow', text: 'pillow', translation: '枕头', color: 'red' },
  { id: 'word-blanket', text: 'blanket', translation: '毯子', color: 'red' },
  { id: 'word-bear', text: 'bear', translation: '熊', color: 'red' },
  { id: 'word-candy', text: 'candy', translation: '糖果', color: 'red' },
  { id: 'word-ice-cream', text: 'ice cream', translation: '冰淇淋', color: 'red' },
  { id: 'word-chips', text: 'chips', translation: '薯条', color: 'red' },
  { id: 'word-police-officer', text: 'police officer', translation: '警察', color: 'red' },
  { id: 'word-farmer', text: 'farmer', translation: '农民', color: 'red' },
  { id: 'word-doctor', text: 'doctor', translation: '医生', color: 'red' },
  { id: 'word-he', text: 'he', translation: '他', color: 'red' },
  { id: 'word-she', text: 'she', translation: '她', color: 'red' },
  { id: 'word-swing', text: 'swing', translation: '秋千', color: 'red' },
  { id: 'word-run', text: 'run', translation: '跑步', color: 'red' },
  { id: 'word-slide', text: 'slide', translation: '滑梯', color: 'red' },
  { id: 'word-see-saw', text: 'see-saw', translation: '跷跷板', color: 'red' },
  { id: 'word-daddy', text: 'daddy', translation: '爸爸', color: 'red' },
  { id: 'word-mummy', text: 'mummy', translation: '妈妈', color: 'red' },
  { id: 'word-brother', text: 'brother', translation: '兄弟', color: 'red' },
  { id: 'word-sister', text: 'sister', translation: '姐妹', color: 'red' },
  { id: 'word-soap', text: 'soap', translation: '肥皂', color: 'red' },
  { id: 'word-towel', text: 'towel', translation: '毛巾', color: 'red' },
  { id: 'word-shampoo', text: 'shampoo', translation: '洗发水', color: 'red' },
  { id: 'word-moon', text: 'moon', translation: '月亮', color: 'red' },
  { id: 'word-sky', text: 'sky', translation: '天空', color: 'red' },
  { id: 'word-stars', text: 'stars', translation: '星星', color: 'red' },
  { id: 'word-sun', text: 'sun', translation: '太阳', color: 'red' }
];

export const STUDY_RULE_NAMES = POINT_RULES
  .filter(rule => rule[3] === 'study')
  .map(rule => rule[0]);

export const defaultState = {
  points: 0,
  streak: 1,
  selectedTab: 'points',
  mySection: null,
  pointsSection: 'earn',
  shopSection: 'exchange',
  planningSection: 'active',
  pointsBoardView: 'week',
  planningDraftType: 'single',
  literacyItems: [],
  numberBoardSelections: [],
  additionGame: null,
  pinyinSelections: [],
  letterSelections: [],
  wordItems: DEFAULT_WORD_ITEMS.map((item, index) => ({
    ...item,
    createdAt: Date.now() + index,
    updatedAt: Date.now() + index
  })),
  customPointRules: [],
  customDeductRules: [],
  hiddenPointRuleIds: [],
  hiddenDeductRuleIds: [],
  petSection: 'cloud',
  calendarMonth: null,
  previewPet: 'sonicHummingbird',
  collectedPets: [],
  pet: null,
  plans: DEFAULT_PLANS.map((plan, index) => ({
    ...plan,
    id: `default-plan-${index + 1}`,
    done: false,
    createdAt: Date.now()
  })),
  exchangedRewards: [],
  records: [
    { text: '欢迎来到成长记录，初始积分为 0', delta: 0, time: Date.now(), category: 'system' }
  ]
};
