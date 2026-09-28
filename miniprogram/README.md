# 《心芒灵境》微信小程序端 (Vue 3 + Uni-app)

基于荣格心理学潜意识意象投射与大模型赋能的日常心灵卡牌微信小程序端。

---

## 🌟 核心特性与业务闭环

1. **静默登录与能量资产体系**：
   - 小程序启动调用 `wx.login` 获取 Code，换取后台自定义 JWT Token 并本地持久化。
   - 顶部常驻能量指示器（展示今日灵感点数或充盈提示）。
   - 抽牌能量拦截校验：灵感点为 0 时唤起能量充盈弹窗。

2. **3D 抽牌舞台与微触感反馈**：
   - 真实 78 张卡牌池，支持 50 字以内困惑输入与 4 种预设心理场景标签。
   - CSS3 `preserve-3d` 与 `perspective` 实现 3D 卡牌洗牌动效与 180° 立体翻转。
   - 切牌触感震动反馈（调用微信 `wx.vibrateShort({ type: 'light' })`）。

3. **大模型 SSE 流式解读与维度结构化展现**：
   - 微信端采用 `wx.request({ enableChunked: true })` 监听 `onChunkReceived`，H5 端采用 Fetch 流。
   - 实时打字机渲染并智能结构化拆解：
     - **【今日心灵定调】** (TAG)
     - **【潜意识意象投射】** (PROJECTION)
     - **【思维盲区与视角转念】** (BLINDSPOT)
     - **【今日正念行动建议】** (ACTION)
     - **【赋能金句】** (AFFIRMATION)

4. **朋友圈能量海报生成 (Canvas 2D)**：
   - 750 × 1334 高清规格 Canvas 2D 绘制。
   - 神秘星空深邃渐变、神圣几何金色烫金边框、卡牌高清原画、4 字能量词、正念金句、微信太阳菊花码。
   - 一键保存到手机相册（内置授权拦截引导与兼容机制）。

5. **裂变与激励闭环**：
   - **微信好友分享**：`onShareAppMessage` 携带 `inviter_id`，好友进入小程序 `onLoad` 检测参数并调用 `/api/v1/share/accept` 完成双方补能。
   - **激励视频广告**：对接微信原生激励广告 `wx.createRewardedVideoAd`，完播后触发服务端核销回调 `/api/v1/ad/reward-callback`。

6. **往日回响 (历史记录)**：
   - 真实请求 `/api/v1/tarot/history` 分页拉取历史抽牌数据。
   - 心灵觉察看板（累计次数、主导能量、高频原型）。
   - 瀑布流列表与点击回放历史解读。

---

## 📁 页面与目录结构

```
miniprogram/
├── dist/
│   ├── build/mp-weixin/    # 微信开发者工具直接导入运行目录
│   └── dev/h5/             # H5 预览编译产物
├── src/
│   ├── api/                # 后台接口真实调用模块
│   │   ├── auth.ts         # 静默登录与 Token 交换
│   │   ├── user.ts         # 用户资料与能量资产
│   │   ├── tarot.ts        # 抽牌、卡牌库检索与历史记录
│   │   ├── share.ts        # 好友裂变受邀接收
│   │   └── ad.ts           # 激励视频广告完播核销
│   ├── components/
│   │   └── EnergyModal.vue # 能量充盈弹窗（分享好友 + 激励短片）
│   ├── pages/
│   │   ├── index/index.vue       # 灵境主台 (3D 抽牌舞台与困惑输入)
│   │   ├── reading/result.vue    # 能量解析页 (大模型 SSE 流式打字机)
│   │   ├── poster/view.vue       # 朋友圈海报页 (Canvas 2D 750x1334)
│   │   └── profile/history.vue   # 往日回响 (历史记录与看板)
│   ├── static/             # 离线与兜底卡牌/卡背美术资源
│   ├── stores/             # Pinia 状态管理
│   │   ├── user.ts         # 用户与能量状态
│   │   └── tarot.ts        # 抽牌与流式推流状态
│   ├── types/              # TypeScript 类型定义
│   ├── utils/
│   │   ├── canvas.ts       # Canvas 2D 海报绘制引擎
│   │   ├── config.ts       # 接口 BaseURL 与环境配置
│   │   ├── request.ts      # uni.request 统一请求拦截器
│   │   └── stream.ts       # 跨端 SSE 分块流解码读取器
│   ├── App.vue             # 全局深色宇宙神圣几何样式与生命周期
│   ├── main.ts             # 应用入口 (Pinia 注册)
│   ├── pages.json          # 页面路由与 TabBar 配置
│   └── manifest.json       # 微信小程序权限与应用配置
├── package.json
└── vite.config.ts          # Vite 配置与接口反向代理
```

---

## 🚀 启动与调试方式

### 1. 本地 H5 开发与调试预览
```bash
cd miniprogram
npm run dev:h5
```
浏览器访问：`http://localhost:5174/`

### 2. 导入微信开发者工具运行

#### 方式 A：开发调试模式（支持代码修改热更新，推荐）
1. 在终端运行监听编译：
```bash
cd miniprogram
npm run dev:mp-weixin
```
2. 打开 **微信开发者工具** -> **导入项目**：
   - **项目目录**：选择 `/Users/clao/心芒灵境/miniprogram/dist/dev/mp-weixin`（或选择源码根目录 `/Users/clao/心芒灵境/miniprogram`，内部已配置 `miniprogramRoot: dist/dev/mp-weixin`）
   - **AppID**：使用您的微信小程序 AppID（已内置配置）
   - **不校验合法域名**：开发设置中勾选「不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书」

#### 方式 B：打包构建模式
```bash
cd miniprogram
npm run build:mp-weixin
```
微信开发者工具导入目录：`/Users/clao/心芒灵境/miniprogram/dist/build/mp-weixin`。
