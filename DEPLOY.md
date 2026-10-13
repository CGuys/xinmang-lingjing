# 《心芒灵境》项目一键部署指南

本项目采用全自动化部署架构，提供 **Shell 脚本一键自动化部署**（支持 PM2 + Nginx）以及 **Docker Compose 容器化部署** 两种方案。

---

## 目录结构说明

```
心芒灵境/
├── deploy.sh                     # 核心：一键部署与运维管理脚本
├── ecosystem.config.cjs          # PM2 生产环境进程守护配置
├── docker-compose.yml            # Docker 容器化编排文件
├── deploy/
│   ├── nginx/
│   │   ├── xinmang.conf          # 传统服务器 Nginx 生产反代配置 (带 SSE 优化)
│   │   └── docker-nginx.conf     # Docker 容器专用 Nginx 配置
│   └── docker/
│       └── Dockerfile.server     # 服务端 Docker 镜像构建文件
├── server/                       # Node.js + Express + Prisma 后端
├── admin/                        # Vue 3 + Vite 运营管理后台
└── miniprogram/                  # Uni-app (Vue 3) 小程序及 H5 客户端
```

---

## ⚡ 极速开始 (一键部署)

赋予脚本执行权限后，在项目根目录下直接执行：

```bash
# 赋予执行权限 (首次)
chmod +x deploy.sh

# 执行完整一键部署 (依赖安装 -> 数据库同步 -> 全量打包构建 -> PM2 启动)
./deploy.sh
```

---

## 常用脚本命令一览

| 命令 | 功能说明 |
| :--- | :--- |
| `./deploy.sh` 或 `./deploy.sh all` | 完整一键部署：自动检查环境、安装依赖、同步数据库、全量构建产物、PM2守护启动 |
| `./deploy.sh build` | 仅执行三个工程的安装依赖与全量静态资源编译打包 |
| `./deploy.sh start` | 使用 PM2 启动生产环境后端服务 |
| `./deploy.sh stop` | 停止 PM2 守护的服务 |
| `./deploy.sh restart` | 平滑重启后端服务 |
| `./deploy.sh status` | 查看当前后台服务运行状态与执行健康探针检查 |
| `./deploy.sh docker` | 使用 Docker Compose 进行全栈容器化一键构建与部署 |
| `./deploy.sh help` | 查看帮助说明 |

---

## 方案一：Linux 服务器部署 (PM2 + Nginx 推荐)

### 1. 环境准备
- 推荐操作系统：Ubuntu 20.04+ / Debian 11+ / CentOS 7+ / macOS
- Node.js: >= 18.0.0
- Nginx: >= 1.18.0
- 全局安装 PM2 (可选，若无脚本将自动降级使用 npx pm2):
  ```bash
  npm install -g pm2
  ```

### 2. 执行一键构建
```bash
./deploy.sh
```

### 3. 配置 Nginx
将项目中生成的 `deploy/nginx/xinmang.conf` 复制或软链到系统的 Nginx 配置目录中：
```bash
# 例如 Ubuntu / Debian:
sudo cp deploy/nginx/xinmang.conf /etc/nginx/conf.d/xinmang.conf

# 修改 xinmang.conf 中的 root 路径为你的实际项目路径：
# 1) miniprogram/dist/build/h5
# 2) admin/dist

# 测试并重载 Nginx
sudo nginx -t
sudo nginx -s reload
```

> **重点提示**：本项目包含大模型心理投射的 **SSE (Server-Sent Events) 流式中转**，Nginx 配置中已默认包含关键调优参数：
> ```nginx
> proxy_buffering off;
> proxy_cache off;
> proxy_read_timeout 600s;
> chunked_transfer_encoding on;
> ```
> 请务必保留此项配置，避免流式响应被 Nginx 缓冲导致前端无法实时接收打字效果。

---

## 方案二：Docker Compose 容器化部署

如果你的服务器已安装 Docker 与 Docker Compose，可以实现环境完全隔离的一键拉起：

```bash
./deploy.sh docker
```
或者手动执行：
```bash
# 1. 编译前端静态物
cd admin && npm run build
cd ../miniprogram && npm run build:h5
cd ..

# 2. 容器集群构建启动
docker compose up -d --build
```

### 默认端口映射
- **H5 客户端**：`http://服务器IP:80`
- **运营后台**：`http://服务器IP:8080`
- **后端 API**：`http://服务器IP:3000`

---

## 关键环境变量配置 (`server/.env`)

在正式上线前，请确认 `server/.env` 中的配置项：
- `DATABASE_URL`: 默认本地 SQLite (`file:./dev.db`)，高并发场景可切换为 PostgreSQL 或 MySQL。
- `LLM_API_KEY`: 大模型 API Key (如 DeepSeek / GLM 等)。
- `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`: 阿里云 OSS 资源存储配置。
- `JWT_SECRET` / `ADMIN_JWT_SECRET`: 生产环境建议替换为高强度随机密匙。
