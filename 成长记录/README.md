# 成长记录

一个适合 iPad / 手机使用的儿童成长记录 / 积分激励 / 学习练习应用。

## 项目现状

- 纯前端静态站点：`index.html + ES Modules + CSS`，无框架、无构建链
- 数据默认保存在浏览器 `localStorage`，刷新不丢
- **支持账号登录 + 跨设备同步**（`cloud.js`，可选能力，没登录也能正常用）
- 支持导出 / 导入 JSON 备份
- 有两个线上地址，用途不同，见下方「线上地址」

## 当前功能

目前项目主要包含：

- 积分记录：加分 / 减分、积分记录
- 学习模块：数字、加法、拼音、汉字、英文字母、英文单词
- 任务模块：进行中 / 已完成任务
- 日历模块：按月查看
- 商城模块：积分兑换
- 我的模块：导出 / 导入数据、兑换记录、积分明细、**账号与同步**

## 线上地址

这一条最容易搞错：**给设备日常用的只有一个地址。**

| 地址 | 用途 | 能否登录同步 |
|---|---|---|
| `https://growth-record-53859.app.workbuddy.host/` | **正式版**，手机 / iPad 收藏这个 | 可以 |
| `https://lll887583-cmd.github.io/chengzhangjilu/` | 只读演示副本 | 不可以，数据纯本机 |

两份数据是各存各的，互不相通。演示副本上会自动显示一条底部说明并给出正式版链接。

云端服务会按域名校验访问来源，所以只有在正式域名下登录才有效；其它域名（含 `localhost`）
会显示「当前地址不支持账号同步」，其余功能不受影响。

## 线上预览

正式版（家人日常使用请收藏这个）：

```text
https://growth-record-53859.app.workbuddy.host/
```

只读演示副本（不做日常使用）：

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
  - 同时负责积分增量的捕获（每次变动记成一条待同步流水）
- `cloud.js`
  - 云端同步层（可选能力）：SDK 初始化、邮箱登录 / 注册 / 改密、积分流水推送、快照同步
  - 设计原则：本地优先。没登录、没网络、SDK 加载失败、域名不匹配都静默降级
- `scripts/check.mjs`
  - 静态自检：模块图、`?v=` 版本号一致性、云端快照字段归类、PWA 配色一致性
- `icons.js`
  - 内联 SVG 图标集合
- `styles.css`
  - 样式总入口
- `styles/`
  - 分模块样式：基础、布局、导航、组件、页面、弹层、响应式
- `assets/`
  - Logo、奖励图片等静态资源
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
- 改视觉样式：优先改 `styles/` 对应模块

## 开发注意事项

- 这个项目不是 React / Vue / Next 项目，不要默认按框架项目思路处理
- 小需求优先局部改，不要一上来重构整个导航、状态层或存储层
- 改状态结构时，除了默认 state，还要同步检查 `normalizeState`
- 改导入导出结构时，要一起检查 `buildBackupPayload` 和 `importPersistedState`
- 如果只是规则、奖池、文案、卡片结构变化，优先改配置和视图，不要过度改底层

## 发布说明

改完之后**必须走「部署」这一步**，光 commit + push 线上不会变。

### 1. 正式版（给设备用的那个）

```bash
# 在 WorkBuddy 里让助手执行：「发布 / 上线 成长记录」
# 部署参数：directory=/Users/macbookpro/Documents/Daily/成长记录，domainPrefix=growth-record
```

发布后建议核一遍线上是不是真的拿到了新文件：

```bash
cd /Users/macbookpro/Documents/Daily/成长记录
for f in app.js index.html styles.css styles/overlays.css; do
  L=$(shasum -a 256 "$f" | cut -c1-12)
  R=$(curl -s -m 25 "https://growth-record-53859.app.workbuddy.host/$f?t=$(date +%s)" | shasum -a 256 | cut -c1-12)
  [ "$L" = "$R" ] && echo "$f 一致" || echo "$f 不一致（线上还是旧版）"
done
```

注意：改了 CSS 或 JS 还要同步刷新 `?v=` 版本号（见下），否则设备端拿到的还是旧缓存。

### 2. 演示副本（GitHub Pages）

推送到 `main` 后由 GitHub Actions 自动发布 `.github/workflows/deploy-pages.yml`，无需手动干预。

## 缓存版本号（`?v=`）

这个项目没有构建工具，浏览器和手机上的「更新」全靠脚本 / 样式 URL 后面的 `?v=`：

- `index.html`：`styles.css?v=xxx`、`app.js?v=xxx`
- `styles.css`：内部每个 `@import` 的子样式都带自己的 `?v=`
- `app.js` / `views.js` / `views/my.js`：互相 import 时也带 `?v=`

**同一文件在所有引用处必须同版本。** ES 模块按完整 URL 去重，同一模块出现两个版本会各自实例化，
`store.js` 的待同步队列就会出现「写进 A 份、读的是 B 份」的诡异行为。
改完跑 `node scripts/check.mjs`，这条一致性是脚本的检查项之一。

## 自检

```bash
node scripts/check.mjs "/Users/macbookpro/Documents/Daily/成长记录"
```

查四件事：引用的模块文件 / 导出是否还在、`?v=` 版本是否一致、`data.js` 里的数组字段是否
都归类到了 `cloud.js` 的同步策略、PWA 配色是否统一。改动 `data.js` / `store.js` / `cloud.js` /
`index.html` 之后建议跑一遍。

## 当前存储说明

- 数据读写统一在 `store.js`
- 默认使用浏览器 `localStorage`，刷新页面不会丢失
- 登录同步账号后，积分与任务等状态会在多台设备之间同步
- 更换浏览器、清空站点数据后会回到本地初始状态
- “导出数据”会下载当前本地数据的 JSON 备份文件，可通过“导入数据”恢复

## 已知边界（还没解决）

- **删除不同步**：快照里的数组合并是求并集，没有墓碑机制。一台设备删掉的自定义项目，
  另一台设备同步后会把它“复活”。要根治需要加 `deletedIds` 记录，改动中等。
- **非数组字段是后写覆盖**：两台设备在同一分钟内各自改了同一个标量字段（如 `streak`），
  慢的那一端会覆盖快的那一端。积分因为走流水不受影响。
- **隐藏的项目无法撤销传播**：`hiddenPointRuleIds` 等按值求并集，所以「取消隐藏」不会被同步走。
- **没有离线缓存**：有 `manifest.json` 但没有 service worker，断网时添加到主屏幕的图标打不开页面。

## 设计参考

- UI/UX 基础规范：`docs/Duolingo-inspired UI-UX.md`
- 图标映射：`docs/icon-map.md`
- 备份结构说明：`docs/export-backup-schema.md`
