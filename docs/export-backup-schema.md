# 成长记录导出数据说明

本文档说明当前 `成长记录` 本地导出 JSON 的结构，用于备份、迁移、排查和后续版本演进。

## 导出格式

当前导出数据由 `/Users/macbookpro/Documents/Daily/成长记录/store.js` 中的 `buildBackupPayload(state)` 生成，外层结构如下：

```json
{
  "app": "growth-record",
  "version": 1,
  "exportedAt": "2026-06-02T00:00:00.000Z",
  "state": {
    "...": "..."
  }
}
```

说明：

- `app`: 固定为 `growth-record`
- `version`: 当前备份结构版本，现为 `1`
- `exportedAt`: 导出时间，ISO 字符串
- `state`: 实际业务状态

## state 顶层字段

当前 `state` 中应包含这些字段：

```json
{
  "points": 0,
  "streak": 1,
  "selectedTab": "points",
  "mySection": null,
  "pointsSection": "earn",
  "shopSection": "exchange",
  "planningSection": "active",
  "pointsBoardView": "week",
  "planningDraftType": "single",
  "literacyItems": [],
  "numberBoardSelections": [],
  "pinyinSelections": [],
  "letterSelections": [],
  "wordItems": [],
  "customPointRules": [],
  "customDeductRules": [],
  "hiddenPointRuleIds": [],
  "hiddenDeductRuleIds": [],
  "petSection": "cloud",
  "calendarMonth": null,
  "previewPet": "sonicHummingbird",
  "collectedPets": [],
  "pet": null,
  "plans": [],
  "exchangedRewards": [],
  "records": []
}
```

## 重点新增字段

这些字段是近期 UI / 学习成长 / 任务 / 日历能力扩展后需要特别关注的：

- `planningSection`: 任务页当前分段，`active` 或 `done`
- `pointsBoardView`: 我的-积分看板当前维度，`week` / `month` / `year`
- `planningDraftType`: 新建任务时默认类型，`single` / `longTerm`
- `numberBoardSelections`: 数字页当前选中项
- `pinyinSelections`: 拼音页当前选中项
- `letterSelections`: 英文字母页当前选中项
- `calendarMonth`: 日历当前浏览月份
- `petSection`: 我的-宠物页当前分段
- `hiddenPointRuleIds`: 已隐藏的加分项
- `hiddenDeductRuleIds`: 已隐藏的减分项

## literacyItems 结构

汉字卡数据：

```json
[
  {
    "id": "literacy-1717000000000",
    "text": "汉",
    "color": "red",
    "createdAt": 1717000000000,
    "updatedAt": 1717000000000
  }
]
```

字段说明：

- `id`: 唯一标识
- `text`: 单个汉字
- `color`: `red` / `yellow` / `green`
- `createdAt`: 创建时间戳
- `updatedAt`: 最后更新时间戳

## wordItems 结构

英文单词卡数据：

```json
[
  {
    "id": "word-1717000000000",
    "text": "apple",
    "translation": "",
    "color": "red",
    "createdAt": 1717000000000,
    "updatedAt": 1717000000000
  }
]
```

字段说明：

- `id`: 唯一标识
- `text`: 英文单词
- `translation`: 预留的中文释义字段
- `color`: `red` / `yellow` / `green`
- `createdAt`: 创建时间戳
- `updatedAt`: 最后更新时间戳

说明：

- 当前界面已实际使用 `color`
- `translation` 已在状态归一化中保留，后续若补充中英文双字段可直接复用

## plans 结构

任务数据：

```json
[
  {
    "id": "plan-1717000000000-0",
    "title": "口算 10 题",
    "points": 8,
    "category": "study",
    "planType": "single",
    "done": false,
    "createdAt": 1717000000000,
    "completedAt": null
  }
]
```

字段说明：

- `title`: 任务名称
- `points`: 完成后加分
- `category`: 当前主要为 `study`
- `planType`: `single` 或 `longTerm`
- `done`: 是否已完成
- `completedAt`: 完成时间戳，未完成时为 `null`

## exchangedRewards 结构

兑换记录数据至少应支持：

```json
[
  {
    "id": "toy",
    "name": "买 1 个玩具",
    "cost": 60,
    "time": 1717000000000,
    "exchangeId": "toy-1717000000000-0"
  }
]
```

重点字段：

- `exchangeId`: 每一条兑换记录的唯一标识

## records 结构

积分流水 / 系统记录：

```json
[
  {
    "text": "欢迎来到成长记录，初始积分为 0",
    "delta": 0,
    "time": 1717000000000,
    "category": "system"
  }
]
```

常见字段：

- `text`: 记录文案
- `delta`: 积分变化值
- `time`: 时间戳
- `category`: 如 `system` / `study` / `exchange`

## 兼容策略

当前项目仍使用：

- `version: 1`
- `normalizeState()` 自动补齐缺省字段

这意味着：

- 旧备份只要主体结构没坏，通常仍可导入
- 新增字段缺失时，会在导入时补默认值
- 若未来出现真正不兼容的数据结构变更，再考虑提升 `version`

## 当前是否需要升级备份版本

当前建议：

- 暂不升级 `version`
- 继续依赖 `normalizeState()` 做兼容
- 先把字段说明同步完整

如果后续出现以下情况，再考虑升级到 `version: 2`：

- `wordItems` 正式强依赖 `translation`
- 任务、商城、宠物、日历的数据结构再次发生不兼容变化
- 导入逻辑需要区分旧版和新版字段映射
