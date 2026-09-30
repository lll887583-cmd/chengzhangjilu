# AGENTS.md

本文件面向在本仓库内协作的 Codex / AI 助手 / 开发者，帮助快速理解 `成长记录` 项目当前的真实结构和修改边界。

## 1. 项目概览

- 仓库根目录：`/Users/macbookpro/Documents/Daily`
- 实际项目目录：`/Users/macbookpro/Documents/Daily/成长记录`
- 项目类型：纯前端静态站点，适合 iPad 使用的儿童成长记录 / 积分激励 / 学习练习 Demo
- 线上发布：GitHub Pages
- 当前发布方式：推送到 `main` 后，由 GitHub Actions 自动发布 `成长记录/` 目录，不再手动维护 `gh-pages`

## 2. 当前核心功能

项目目前不是单页小展示，而是一套静态前端互动系统，主要包含：

- 积分记录：加分 / 减分、积分记录、积分看板
- 学习模块：数字、加法、拼音、汉字、英文字母、英文单词
- 任务模块：进行中 / 已完成任务
- 日历模块：按月查看
- 商城模块：积分兑换 + 积分抽奖
- 我的模块：导出/导入数据、兑换记录、积分明细等
- 宠物/成长体系：宠物素材、宠物收集与相关成长反馈

## 3. 技术形态

- 无框架原生前端：`index.html + ES Modules + CSS`
- 不依赖后端
- 数据默认存储在浏览器 `localStorage`
- 支持导出 / 导入 JSON 备份

不要把它误判为 React / Vue / Next 项目，也不要引入构建链，除非用户明确要求重构。

## 4. 目录与职责

### 根目录

- `.github/workflows/deploy-pages.yml`
  - GitHub Pages 自动发布流程
  - `push` 到 `main` 后自动把 `成长记录/` 发布出去
- `serve.sh`
  - 根目录轻量启动脚本

### `成长记录/`

- `index.html`
  - 页面骨架、字体、样式入口、`app.js` 挂载入口
- `app.js`
  - 主交互控制器
  - 负责状态驱动渲染、按钮事件、导航切换、抽奖、兑换、导入导出、学习互动等
- `views.js`
  - 统一导出各视图模块
- `views/`
  - 各页面视图模板
  - `points.js`、`planning.js`、`calendar.js`、`shop.js`、`my.js`
  - `numbers.js`、`literacy.js`、`learning.js`
  - `pet.js`、`shared.js`
- `data.js`
  - 高频配置入口
  - 积分规则、扣减规则、兑换商品、抽奖奖池、默认任务、默认状态
- `pets.js`
  - 宠物 IP 数据、图片映射、领养/复活等配置
- `store.js`
  - 本地存储、状态补齐、导入导出、记录写入、消费积分等
  - 同时负责「云端记账」：`saveState` 里比对积分前后差值，把每次变动记成一条待同步流水
  - 注意：文件末尾那一节（`capturePointsDelta` / `cloudQueueList` 等）属于云端同步的本地记账，不要随意改动
- `cloud.js`
  - 云端同步层（可选能力）
  - 负责 SDK 初始化、邮箱登录/注册/改密、积分流水推送与拉取、快照同步
  - 设计原则：本地优先。没登录、没网络、SDK 加载失败、域名不匹配，都必须静默降级，不能影响本地使用
- `icons.js`
  - 内联 SVG 图标集合
- `styles.css`
  - 样式总入口
- `styles/`
  - 分模块样式：基础、布局、导航、组件、页面、弹层、宠物、响应式
- `assets/`
  - Logo、宠物图片、奖励图片等静态资源
- `docs/`
  - 设计规范、图标映射、备份结构说明

## 5. 最常见改动入口

遇到需求时，优先局部修改，不要一上来全局重构。

- 改积分任务：`成长记录/data.js` 的 `POINT_RULES`
- 改减分任务：`成长记录/data.js` 的 `DEDUCT_RULES`
- 改兑换商品：`成长记录/data.js` 的 `REWARDS`
- 改抽奖奖池：`成长记录/data.js` 的 `LOTTERY`
- 改默认任务：`成长记录/data.js` 的 `DEFAULT_PLANS`
- 改页面文案/卡片结构：优先找 `成长记录/views/` 对应页面
- 改交互流程：优先找 `成长记录/app.js`
- 改存储或备份结构：`成长记录/store.js`
- 改宠物数据或素材映射：`成长记录/pets.js`
- 改视觉样式：优先找 `成长记录/styles/` 的对应模块

## 6. 高频改动对照表

如果需求比较口语化，先按下面这张表定位，不要盲目全项目搜索：

- 顶部切换、主导航、抽屉、顶部积分按钮：`成长记录/app.js`
- 商城兑换 / 抽奖页结构：`成长记录/views/shop.js`
- 我的页面、积分看板、兑换记录、积分记录：`成长记录/views/my.js`
- 学习综合页（加法 / 拼音 / 字母 / 单词）：`成长记录/views/learning.js`
- 汉字页：`成长记录/views/literacy.js`
- 数字页：`成长记录/views/numbers.js`
- 任务页：`成长记录/views/planning.js`
- 日历页：`成长记录/views/calendar.js`
- 宠物页 / 首页宠物展示：`成长记录/views/pet.js`
- 规则、奖池、奖励、默认任务：`成长记录/data.js`
- 本地存储、状态兼容、导入导出：`成长记录/store.js`
- 图标：`成长记录/icons.js`
- 页面样式：`成长记录/styles/` 对应模块

## 7. 当前真实导航结构

主导航当前以 `app.js` 中的 `NAV_ITEMS` 为准，主要包括：

- 记录
- 数字
- 加法
- 拼音
- 汉字
- 英文字母
- 英文单词
- 商城
- 目标

暂时隐藏的入口（`NAV_ITEMS` 中已注释，视图与逻辑均保留，取消注释即可恢复）：

- 任务（`planning`）
- 日历（`calendar`）

额外入口：

- “我的”通过头像按钮 / 抽屉额外入口进入
- 顶部还有积分按钮、抽屉按钮等交互入口

修改导航时，先看 `app.js`，再看对应 `views/` 和 `styles/navigation.css`。

## 8. 当前数据与状态约定

- 数据源默认来自 `data.js`
- 运行时状态由 `app.js` 持有
- 持久化统一走 `store.js`
- `store.js` 会做状态补齐与兼容修正，改状态结构时必须同步更新 `normalizeState`

特别注意：

- 不要只改默认 state 而忘记改 `normalizeState`
- 不要只改 UI 文案而忘记相应记录文案、toast 文案、导出数据结构
- 改状态字段名时，要考虑旧 `localStorage` 数据是否还能兼容
- 改导入导出结构时，要一起检查 `buildBackupPayload` 和 `importPersistedState`

## 9. 发布与分支约定

当前期望工作流：

1. 修改 `成长记录/` 内代码
2. 提交并推送到 `main`
3. GitHub Actions 自动发布 GitHub Pages

说明：

- `gh-pages` 不再作为日常手动发布分支使用
- 如果发布异常，先检查 `.github/workflows/deploy-pages.yml`
- GitHub Pages 应设置为 `GitHub Actions` 作为发布来源

## 10. 发布故障排查

如果出现“代码已经推到 `main`，但线上没更新”，按这个顺序排查：

1. 先看 `/Users/macbookpro/Documents/Daily/.github/workflows/deploy-pages.yml` 是否还在
2. 去 GitHub 仓库 `Settings > Pages`，确认发布来源是 `GitHub Actions`
3. 去 GitHub 仓库 `Actions`，确认最新一次 Pages workflow 是否成功
4. 确认这次改动是不是已经真的推送到了远端 `main`

## 11. 本地预览

这个仓库里有两个启动方式，访问路径不要混淆：

- 如果运行根目录脚本：`/Users/macbookpro/Documents/Daily/serve.sh`
  - 访问：`http://localhost:5173/成长记录/`
- 如果先进入子目录 `成长记录/` 再直接开静态服务
  - 访问：`http://localhost:5173/`

优先使用以下方式启动：

```bash
cd /Users/macbookpro/Documents/Daily
./serve.sh
```

或：

```bash
cd /Users/macbookpro/Documents/Daily/成长记录
python3 -m http.server 5173
```

访问：

```text
http://localhost:5173/
```

如果你是从仓库根目录启动：

```text
http://localhost:5173/成长记录/
```

## 12. 验证规则

这个项目默认做“轻量验证”，不要无关放大验证范围：

- 小改动优先本地打开对应页面做目视检查
- 默认不要求跑全局测试、构建链或大范围回归
- 如果只是改规则、文案、奖池、卡片结构，优先验证对应页面和交互
- 只有当需求明确涉及发布、存储兼容、导入导出时，才做对应专项检查

## 13. 修改原则

针对这个项目协作时，默认遵守下面几条：

- 保持中文文案和页面意图与需求一致
- 优先小改、局部改，避免无关重构
- 不要随意替换现有视觉风格、导航结构、存储结构
- 静态项目优先保持简单，不要平白引入框架、打包器或后端依赖
- 如果只是规则、奖项、文案、卡片结构变化，优先改配置和视图，不要过度改底层

## 14. 不要随便改的内容

- 不要随意修改 `localStorage` 使用的存储键和数据结构
- 不要随意改备份 schema 或删除导入兼容逻辑
- 不要未经确认把当前 `main -> GitHub Actions -> Pages` 流程改回手动维护 `gh-pages`
- 不要把静态项目强行改成依赖构建工具或后端的项目
- 不要因为单个页面需求去重写整个导航、状态层或存储层

## 15. 最近业务备注

以下信息属于“阶段性业务状态”，后续可能变化，修改前以代码现状为准：

- 截至 2026-06-13：抽奖奖池中的“看电视”项目已去掉
- 截至 2026-06-13：兑换区仍保留“看 40 分钟电视”商品
- 截至 2026-06-13：Pages 自动发布工作流已加入仓库
- 截至 2026-09-30：导航中的“任务”“日历”入口已隐藏（仅注释 `NAV_ITEMS` 对应两项），视图、数据与交互逻辑全部保留，随时可恢复

后续如用户继续调整奖励/抽奖，请先区分：

- 是“积分兑换”商品变化
- 还是“积分抽奖”奖池变化

这两个入口要分别修改，不要混改。

## 16. 云端同步（账号体系）

截至 2026-09-30 加入，用于解决「家长手机 + 孩子平板看到同一份积分」。

### 两个线上地址，别混淆

- 云端同步正式地址：`https://growth-record-53859.app.workbuddy.host/`（推荐给设备使用）
- GitHub Pages（旧地址）：`https://lll887583-cmd.github.io/chengzhangjilu/`

**登录只在正式地址可用。** 云端服务会校验访问来源域名，GitHub Pages 属于另一个域名，
在新地址的 app 里会显示「当前地址不支持账号同步」，但其余功能完全正常。
两个地址的数据是各自独立的：GitHub Pages 那份走纯本地存储。

### 数据落在哪里

| 云端表 | 用途 |
|---|---|
| `growth_ledger` | 孩子的积分流水，只追加不修改 |
| `growth_snapshot` | 其余状态快照（任务、宠物、设置、学习进度等） |

外加一个聚合函数 `growth_sync_pull(limit_ops)`，一次请求同时返回「积分总和」和「最近的流水」。

### 为什么积分要单独走流水

积分 = 云端所有流水 `delta` 之和。两端同时加分只会各追加一条，不会互相覆盖，
所以**孩子的积分永远不会因为同步冲突而丢失**。这是这套设计最核心的取舍。

其余状态走整包快照、后写覆盖；数组字段（任务、宠物图鉴、兑换记录等）按 id 求并集，
尽量保住两边的改动。快照冲突的代价低，积分冲突的代价高，两者用不同策略是有意的。

### 几个必须知道的坑

- **积分增量的唯一捕获点是 `store.js` 的 `saveState`**。任何改积分的地方最终都会经过它，
  所以新增功能时不需要额外埋点；但也**不要绕过 `saveState` 直接改 localStorage**。
- **从云端合并回来的积分必须先打基线**（`markPointsBaseline`），否则会被误记成一条新流水。
- **云端合并写回本地时要拦住重新排队**（`cloud.js` 的 `applyingRemote` 标记），否则会同步死循环。
- **模块导入的版本号后缀必须一致**。ES 模块按完整 URL 去重，`./store.js` 和 `./store.js?v=xxx`
  会被当成两个模块各自实例化，待同步队列就会出现「写进 A 份、读的是 B 份」的错乱。
  改 `store.js` / `cloud.js` 时，记得把 `app.js`、`cloud.js`、`views.js`、`views/my.js` 里的版本号一起刷新。
- **改了 app.js 或样式，要同步刷新 `index.html` 和 `styles.css` 里的 `?v=`**，否则设备上还是旧版。
- **「我的」必须算作合法页面**（`UI_TABS = [...NAV_TABS, 'my']`）。`my` 不在侧边栏 `NAV_ITEMS` 里，
  如果只用 `isNavTab` 校验 `state.selectedTab`，`render('my')` 内部的 `persist()` 会把
  `selectedTab` 悄悄改写成 `points`；此后任何 `render(state.selectedTab)`（宠物互动、
  或云端同步写回后的重绘）都会把用户从「我的」弹回「记录-加分」。加新页面时注意同步这份名单。
- **云端写回本地时，界面状态（`selectedTab` / `mySection` / `pointsSection` 等）必须保留本机的**。
  `cloud.js` 的 `contentOf` 会把这些键排除在快照之外，`app.js` 的 `applyState` 再用
  `pickViewState` 兜一层，两边都不能省。

### 怎么改云端相关的东西

- 改登录界面文案或表单：`成长记录/views/my.js` 的 `cloudSectionBody`
- 改登录交互流程：`成长记录/app.js` 的 `submitCloudForm` / `sendCloudCode`
- 改同步算法：`成长记录/cloud.js` 的 `runSync`
- 改表结构或权限：云服务数据库工具（不要用前端代码跑 DDL）

### 首次登录时的数据归属规则

- 云端流水为空 → 用本机数据初始化云端（会把本机当前积分作为基线写入）
- 云端已有数据 → 以云端为准，本机原有数据另存一份备份（`growth-record-cloud-backup`），不作废

目的是让「先在平板上用起来、之后手机再登录」这个顺序不会把平板的积分弄丢或翻倍。

