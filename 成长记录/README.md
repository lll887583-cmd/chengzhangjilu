# 成长记录

一个 iPad 友好的儿童积分宠物养成 Demo。

## 线上预览

GitHub Pages 地址：

```text
https://lll887583-cmd.github.io/chengzhangjilu/
```

## 本地预览

localhost 地址：

```text
http://localhost:5173/成长记录/
```

启动命令：

```bash
./serve.sh
```

或：

```bash
python3 -m http.server 5173
```

启动后打开上面的 localhost 地址。

## 当前版本

- 静态网页，可部署到 GitHub Pages
- 数据暂存在浏览器 localStorage
- 图片素材位置预留在 `assets/`
- Firebase/Firestore 数据结构和接入说明预留在页面里
- UI/UX 基础规范在 `docs/Duolingo-inspired UI-UX.md`

## Codex 快速修改地图

优先按下面范围改动，避免每次重新全局定位：

- `pets.js`：宠物 IP、属性、领养/复活积分和图片路径
- `data.js`：积分规则、扣减规则、兑换奖励、抽奖奖项、默认初始数据
- `store.js`：localStorage 读写、状态补齐、积分扣减、成长记录追加
- `views/`：各页面 HTML 渲染、中文文案、卡片结构
- `app.js`：按钮事件、积分/宠物/兑换/核销/抽奖交互逻辑
- `styles.css`：样式入口；具体样式在 `styles/` 分模块维护
- `icons.js`：内联 SVG 图标集合
- `assets/`：Logo、宠物图片等静态素材

常见需求优先入口：

- 新增或调整积分任务：只改 `data.js` 的 `POINT_RULES`
- 新增或调整扣减任务：只改 `data.js` 的 `DEDUCT_RULES`
- 新增或调整兑换商品：只改 `data.js` 的 `REWARDS`
- 新增宠物：先改 `pets.js` 的 `PETS`，再放入对应图片到 `assets/pets/`
- 调整页面文案：优先改 `views/` 对应页面模块
- 调整颜色、间距、按钮、卡片：优先改 `styles/` 对应样式模块

## 推荐正式方案

- GitHub Pages：托管网页和固定图片素材
- Firebase Auth：匿名登录或邮箱登录
- Firestore Spark：保存积分、宠物、兑换、抽奖和成长记录
- 不使用 Firebase Storage、Cloud Functions、手机号登录、Blaze 付费计划
