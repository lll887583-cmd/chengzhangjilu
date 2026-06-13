# 成长记录

一个适合 iPad 使用的儿童成长记录 / 积分激励 / 学习练习静态 Demo。

## 项目现状

- 纯前端静态站点：`index.html + ES Modules + CSS`
- 不依赖后端
- 数据默认保存在浏览器 `localStorage`
- 支持导出 / 导入 JSON 备份
- 线上通过 GitHub Pages 发布
- 当前发布方式：推送到 `main` 后，由 GitHub Actions 自动发布，不再手动维护 `gh-pages`

## 当前功能

目前项目主要包含：

- 积分记录：加分 / 减分、积分记录、积分看板
- 学习模块：数字、加法、拼音、汉字、英文字母、英文单词
- 任务模块：进行中 / 已完成任务
- 日历模块：按月查看
- 商城模块：积分兑换 + 积分抽奖
- 我的模块：导出 / 导入数据、兑换记录、积分明细
- 宠物体系：宠物收集、宠物展示与相关成长反馈

## 线上预览

GitHub Pages 地址：

```text
https://lll887583-cmd.github.io/chengzhangjilu/
```

## 本地预览

这个仓库有两种常用启动方式，访问路径不一样。

### 方式 1：从仓库根目录启动

```bash
cd /Users/macbookpro/Documents/Daily
./serve.sh
```

访问：

```text
http://localhost:5173/成长记录/
```

### 方式 2：从项目子目录直接启动

```bash
cd /Users/macbookpro/Documents/Daily/成长记录
python3 -m http.server 5173
```

访问：

```text
http://localhost:5173/
```

## 目录说明

- `index.html`
  - 页面骨架、字体、样式入口、`app.js` 挂载入口
- `app.js`
  - 主交互控制器，负责导航切换、事件处理、兑换、抽奖、学习互动、导入导出等
- `views.js`
  - 统一导出各页面视图模块
- `views/`
  - 各页面结构与文案
- `data.js`
  - 积分规则、减分规则、兑换商品、抽奖奖池、默认任务、默认状态
- `store.js`
  - 本地存储、状态补齐、导入导出、积分消费、记录写入
- `pets.js`
  - 宠物数据、素材映射、领养/复活相关配置
- `icons.js`
  - 内联 SVG 图标集合
- `styles.css`
  - 样式总入口
- `styles/`
  - 分模块样式：基础、布局、导航、组件、页面、弹层、宠物、响应式
- `assets/`
  - Logo、宠物图片、奖励图片等静态资源
- `docs/`
  - UI 规范、图标映射、备份结构说明

## 常见改动入口

- 改积分任务：`data.js` 的 `POINT_RULES`
- 改减分任务：`data.js` 的 `DEDUCT_RULES`
- 改兑换商品：`data.js` 的 `REWARDS`
- 改抽奖奖池：`data.js` 的 `LOTTERY`
- 改默认任务：`data.js` 的 `DEFAULT_PLANS`
- 改页面文案 / 卡片结构：优先改 `views/` 对应模块
- 改交互流程：优先改 `app.js`
- 改本地存储 / 备份结构：`store.js`
- 改宠物数据或素材映射：`pets.js`
- 改视觉样式：优先改 `styles/` 对应模块

## 开发注意事项

- 这个项目不是 React / Vue / Next 项目，不要默认按框架项目思路处理
- 小需求优先局部改，不要一上来重构整个导航、状态层或存储层
- 改状态结构时，除了默认 state，还要同步检查 `normalizeState`
- 改导入导出结构时，要一起检查 `buildBackupPayload` 和 `importPersistedState`
- 如果只是规则、奖池、文案、卡片结构变化，优先改配置和视图，不要过度改底层

## 发布说明

当前期望工作流：

1. 修改 `成长记录/` 内代码
2. 提交并推送到 `main`
3. GitHub Actions 自动发布 GitHub Pages

如果出现“代码已经推到 `main`，但线上没更新”，优先检查：

1. 仓库里是否还存在 `.github/workflows/deploy-pages.yml`
2. GitHub 仓库 `Settings > Pages` 是否设置为 `GitHub Actions`
3. GitHub 仓库 `Actions` 里最新一次 Pages workflow 是否成功

## 当前存储说明

- 数据读写统一在 `store.js`
- 默认使用浏览器 `localStorage`
- 刷新页面不会丢失
- 更换浏览器、清空站点数据后会重置
- “导出数据”会下载当前本地数据的 JSON 备份文件，可通过“导入数据”恢复

## 设计参考

- UI/UX 基础规范：`docs/Duolingo-inspired UI-UX.md`
- 图标映射：`docs/icon-map.md`
- 备份结构说明：`docs/export-backup-schema.md`
