# 侧边栏图标记录

这份文件专门记录 `成长记录` 项目的侧边栏导航图标，避免后续改样式或改逻辑时把 icon 覆盖掉。

## 代码落点

- 图标配置文件：`/Users/macbookpro/Documents/Daily/成长记录/icons.js`
- 侧边栏读取位置：`/Users/macbookpro/Documents/Daily/成长记录/app.js`

当前侧边栏图标统一放在：

- `SIDEBAR_ICONS`

`app.js` 里不要再直接手写侧边栏 icon 的 SVG path，统一从 `SIDEBAR_ICONS` 取。

## 当前映射

### 一级导航

- `points`：记录
- `planning`：任务
- `calendar`：日历
- `shop`：商城
- `my`：我的（仅移动端抽屉额外入口）

### 学习成长

- `numbers`：数字
- `literacy`：汉字
- `pinyin`：拼音
- `letters`：英文字母
- `words`：英文单词

## 修改规则

- 如果以后要替换侧边栏 icon，只改 `icons.js` 里的 `SIDEBAR_ICONS`
- 不要在 `app.js` 的 `LEARNING_ITEMS`、`NAV_ITEMS`、`DRAWER_EXTRA_ITEMS` 里重新写大段 SVG
- 如果新增侧边栏入口，先在 `SIDEBAR_ICONS` 增加配置，再在 `app.js` 引用

## 备注

- 普通业务小图标（如奖励、宠物、按钮图标）仍走 `iconSvg()` 那套
- 侧边栏导航 icon 和普通业务 icon 现在分开管理，互不影响
