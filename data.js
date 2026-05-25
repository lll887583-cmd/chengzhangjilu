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
  { id: 'tv', icon: 'tv', name: '看 40 分钟电视', cost: 100 },
  { id: 'game', icon: 'game', name: '玩 30 分钟游戏', cost: 120 }
];

export const LOTTERY = [
  { name: '获得 5 积分', weight: 20, points: 5, icon: 'star' },
  { name: '获得 10 积分', weight: 15, points: 10, icon: 'star' },
  { name: '买 1 个小零食', weight: 10, points: 0, icon: 'cookie' },
  { name: '看 20 分钟电视', weight: 10, points: 0, icon: 'tv' },
  { name: '神秘奖励', weight: 5, points: 0, icon: 'celebration' }
];

export const DEFAULT_PLANS = [
  { title: '读 15 分钟中文', points: 6, category: 'study' },
  { title: '口算 10 题', points: 8, category: 'study' },
  { title: '英语听读打卡', points: 8, category: 'study' }
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
