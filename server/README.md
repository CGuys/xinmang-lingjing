# 《心芒灵境》服务端 API (xinmang-lingjing-server)

《心芒灵境》是一款基于荣格心理学投射意象与大模型赋能的心理疗愈卡牌产品。本服务端提供了高并发微信静默登录鉴权、每日免费/裂变防刷能量风控、反迷信合规安全网关、AI 大模型 SSE 流式中转、静态高清原画托管及 Web 运营后台全套 API。

---

## 目录
- [技术栈与特性](#-技术栈与特性)
- [快速开始](#-快速开始)
- [本地局域网 IP 访问与部署指南](#-本地局域网-ip-访问与部署指南)
- [环境变量说明](#-环境变量说明)
- [数据库与数据迁移](#-数据库与数据迁移)
- [项目目录结构](#-项目目录结构)
- [API 接口清单概览](#-api-接口清单概览)
- [自动化测试](#-自动化测试)

---

## 🛠 技术栈与特性

- **运行时环境**：Node.js (>= 18) + TypeScript
- **Web 框架**：Express 4.x + CORS 跨域支持
- **ORM 与数据库**：Prisma 5.x + SQLite（默认开箱即用，支持一键无缝切换 PostgreSQL / MySQL）
- **身份认证**：JWT (jsonwebtoken) + bcryptjs
- **大模型支持**：DeepSeek / 智谱 GLM / OpenAI 兼容协议，支持 SSE (Server-Sent Events) 流式响应
- **防刷机制**：内存原子计数 / Redis 降级策略，邀请裂变防自刷、防同日重复套现、每日上限阈值控制
- **合规网关**：内置心理学投射规范 System Prompt、敏感迷信词黑名单拦截、微信安全接口预留

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 初始化环境配置
复制配置模板生成 `.env`：
```bash
cp .env.example .env
```
*(默认配置下已启用 SQLite `file:./dev.db`，可直接启动)*

### 3. 生成 Prisma Client 与初始化数据库
```bash
# 生成 Prisma Client
npm run prisma:generate

# 推送数据表模型到 SQLite 数据库
npm run prisma:push

# 初始化后台超级管理员账号 (默认: admin / Admin@2026)
npm run prisma:seed
```

### 4. 启动开发服务器
```bash
npm run dev
```
启动成功后，控制台将自动打印本地环回及当前局域网 IP 访问地址。

---

## 🌐 本地局域网 IP 访问与部署指南

为了支持**手机端同 Wi-Fi 访问、微信开发者工具/真机调试、多设备联调**，服务端已默认监听 `0.0.0.0` 主机地址。

### 1. 控制台启动输出示例
```text
====================================================
✨ 《心芒灵境》后端 API 服务已成功启动!
📡 本地环回访问: http://localhost:3000
🌐 局域网IP访问: http://192.168.110.41:3000
🔮 静态资产路径: http://192.168.110.41:3000/assets/tarot/cards/00.jpg
🩺 健康检查接口: http://192.168.110.41:3000/health
🚀 运行环境: development (监听地址: 0.0.0.0)
====================================================
```

### 2. 跨设备调试要点
- **网络互通**：确保你的手机或联调设备与运行本服务的电脑处于**同一个 Wi-Fi 网络**。
- **微信开发者工具配置**：
  1. 接口 BaseURL 配置为 `http://<你的局域网IP>:3000`（如 `http://192.168.110.41:3000`）。
  2. 点击微信开发者工具右上角 **「详情」** -> **「本地设置」**。
  3. 勾选 **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**。
- **手机真机预览**：
  - 打开手机 Wi-Fi 确保同局域网；
  - 手机关闭系统代理或梯子/VPN（避免请求被代理劫持）；
  - 先用手机浏览器打开 `http://<你的局域网IP>:3000/health`，若返回 `{"status":"ok"}` 即代表局域网已完全打通。
- **Mac 防火墙**：若 macOS 弹出网络访问许可弹窗，请选择 **「允许」**。

---

## ⚙️ 环境变量说明 (`.env`)

| 环境变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP 服务监听端口 |
| `HOST` | `0.0.0.0` | 监听主机地址，`0.0.0.0` 允许局域网设备通过 IP 访问 |
| `NODE_ENV` | `development` | 运行环境（development / production） |
| `DATABASE_URL` | `"file:./dev.db"` | 数据库连接字符串（SQLite/PostgreSQL/MySQL） |
| `JWT_SECRET` | 随机默认串 | 普通用户 Token 签名密钥 |
| `JWT_EXPIRES_IN` | `7d` | 用户 Token 有效期 |
| `ADMIN_JWT_SECRET` | 随机默认串 | 管理后台 Token 签名密钥 |
| `ADMIN_JWT_EXPIRES_IN` | `2d` | 管理员 Token 有效期 |
| `WECHAT_APP_ID` | `""` | 微信小程序 AppID（留空时自动开启开发者 Mock 模式） |
| `WECHAT_APP_SECRET`| `""` | 微信小程序 AppSecret |
| `REDIS_URL` | `""` | Redis 连接串（留空或连接失败自动降级为内置 Map 缓存） |
| `LLM_PROVIDER` | `deepseek` | 大模型提供商 (`deepseek` / `glm` / `openai`) |
| `LLM_API_KEY` | `""` | 大模型 API Key（留空时返回高质量拟真流式响应） |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | 大模型 Base URL |
| `LLM_MODEL` | `deepseek-chat` | 大模型名称 |
| `ASSETS_PATH` | `../assets` | 78 张卡牌原画静态文件所在路径 |

---

## 💾 数据库与数据迁移

本工程采用 **Prisma ORM** 进行数据库建模和访问：

```bash
# 变更 prisma/schema.prisma 后，生成最新的 TS 类型定义
npm run prisma:generate

# 将 schema 模型变更直接同步应用到当前数据库
npm run prisma:push

# 播种/重置初始管理员账号
npm run prisma:seed
```

> **生产环境切换说明**：若需切换为 PostgreSQL，仅需修改 `prisma/schema.prisma` 中的 `provider = "postgresql"`，并在 `.env` 中填入对应的 `DATABASE_URL` 即可。

---

## 📁 项目目录结构

```text
server/
├── prisma/
│   ├── dev.db              # 本地开发 SQLite 数据库文件
│   └── schema.prisma       # 数据库实体定义模型
├── scripts/
│   └── test-api.ts         # 15 项全流程业务集成自动化测试脚本
├── src/
│   ├── config/
│   │   └── constants.ts    # 环境变量与系统全局默认配置
│   ├── controllers/        # 控制器层（参数校验与接口响应组装）
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── share.controller.ts
│   │   ├── tarot.controller.ts
│   │   └── user.controller.ts
│   ├── data/
│   │   └── tarot-cards.ts  # 78 张心理投射原画卡牌元数据与释义
│   ├── middlewares/        # 中间件（JWT 认证、错误捕获、角色鉴权）
│   ├── models/
│   │   ├── prisma.ts       # Prisma 客户端单例
│   │   └── seed.ts         # 初始数据初始化脚本
│   ├── routes/             # RESTful API 路由模块划分
│   │   └── v1/             # v1 版本路由集合
│   ├── services/           # 核心业务逻辑层（能量风控、大模型网关等）
│   ├── utils/              # 通用工具函数库
│   ├── app.ts              # Express 应用初始化及全局中间件
│   └── index.ts            # 服务主入口（端口与 IP 监听、优雅停机）
├── .env.example            # 环境变量配置模板
├── package.json
└── tsconfig.json
```

---

## 📡 API 接口清单概览

所有 API 均以 `/api/v1` 为前缀：

### 1. 基础与认证
- `GET  /health` - 服务健康状态检查
- `POST /api/v1/auth/wx-login` - 微信静默登录换取 Token（支持一键 Mock）
- `GET  /api/v1/user/profile` - 查询用户个人能量资产与今日免费额度

### 2. 抽牌与心理投射 (SSE)
- `POST /api/v1/tarot/draw` - 消耗能量抽取 1 张卡牌（自动判定正逆位）
- `GET  /api/v1/tarot/stream/:reading_id` - **SSE 流式**返回荣格心理意象投射大模型深度解读
- `GET  /api/v1/tarot/history` - 分页拉取个人历史翻牌档案
- `GET  /api/v1/tarot/library` - 获取 78 张卡牌图鉴元数据

### 3. 社交裂变与广告激励
- `POST /api/v1/share/accept` - 受邀好友进场核验并为邀请人奖励能量（防自刷、防同日重复）
- `POST /api/v1/ad/reward-callback` - 微信激励视频完播服务端异步回调

### 4. 运营管理后台 API
- `POST /api/v1/admin/login` - 运营后台账号密码登录
- `GET  /api/v1/admin/stats` - 获取全局运营大盘核心指标概览
- `GET  /api/v1/admin/users` - 分页检索用户列表与能量明细
- `GET  /api/v1/admin/readings` - 分页拉取所有用户抽牌与心理洞察记录
- `GET  /api/v1/admin/config` - 读取动态业务策略（免费额度、防刷阈值、AI 参数）
- `PUT  /api/v1/admin/config` - 动态保存运营策略、Prompt 及敏感违禁词

---

## 🧪 自动化测试

项目内嵌了一套全流程 15 个场景的集成测试套件，全面覆盖登录、能量流转、抽牌判定、防刷拦截、SSE 解读以及后台管理能力：

```bash
npm run test:api
```

---

## 📄 许可证

[MIT License](LICENSE)
