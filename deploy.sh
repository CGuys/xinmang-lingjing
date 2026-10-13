#!/usr/bin/env bash

# ==============================================================================
# 《心芒灵境》一键构建与部署运维脚本
# 支持常规部署（Node.js + PM2 + Nginx）以及 Docker 容器化一键部署
# ==============================================================================

set -e

# 颜色常量
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"
ADMIN_DIR="${PROJECT_ROOT}/admin"
MINI_DIR="${PROJECT_ROOT}/miniprogram"
LOGS_DIR="${PROJECT_ROOT}/logs"

mkdir -p "${LOGS_DIR}"

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${PURPLE}"
    echo "================================================================"
    echo "       ✨ 《心芒灵境》项目自动化部署工具 v1.0.0 ✨              "
    echo "================================================================"
    echo -e "${NC}"
}

# 1. 检查基础运行环境
check_environment() {
    log_info "正在检查运行环境..."
    
    if ! command -v node &> /dev/null; then
        log_error "未检测到 Node.js，请先安装 Node.js (推荐 v18 或 v20 及以上)！"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    log_success "Node.js 环境就绪: ${NODE_VERSION}"

    if ! command -v npm &> /dev/null; then
        log_error "未检测到 npm 命令！"
        exit 1
    fi
    NPM_VERSION=$(npm -v)
    log_success "npm 环境就绪: v${NPM_VERSION}"

    # 检查 server/.env
    if [ ! -f "${SERVER_DIR}/.env" ]; then
        if [ -f "${SERVER_DIR}/.env.example" ]; then
            log_warn "未发现 server/.env，正在从 .env.example 复制初始化配置..."
            cp "${SERVER_DIR}/.env.example" "${SERVER_DIR}/.env"
            log_success "已创建 server/.env，生产环境上线前请注意按需修改！"
        fi
    fi
}

# 2. 安装与更新各模块依赖
install_dependencies() {
    log_info "正在安装/同步依赖..."

    # 服务端依赖
    log_info ">> [1/3] 安装后端依赖 (server)..."
    cd "${SERVER_DIR}"
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    # 运营后台依赖
    log_info ">> [2/3] 安装运营后台依赖 (admin)..."
    cd "${ADMIN_DIR}"
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    # 小程序 / H5 依赖
    log_info ">> [3/3] 安装小程序/H5依赖 (miniprogram)..."
    cd "${MINI_DIR}"
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    cd "${PROJECT_ROOT}"
    log_success "所有项目模块依赖准备完成！"
}

# 3. 数据库初始化 (Prisma)
prepare_database() {
    log_info "正在同步数据库结构与 Prisma Client..."
    cd "${SERVER_DIR}"
    npx prisma generate
    npx prisma db push --accept-data-loss --skip-generate
    cd "${PROJECT_ROOT}"
    log_success "数据库结构与 Prisma Client 生成完成！"
}

# 4. 全量编译构建静态资源
build_all() {
    log_info "开始执行全量打包构建..."

    # 构建后端
    log_info ">> [1/3] 编译后端 TypeScript..."
    cd "${SERVER_DIR}"
    npm run build
    log_success "后端构建完成 (server/dist)"

    # 构建管理后台
    log_info ">> [2/3] 编译运营管理后台..."
    cd "${ADMIN_DIR}"
    npm run build
    log_success "运营管理后台构建完成 (admin/dist)"

    # 构建 H5 页面
    log_info ">> [3/3] 编译小程序 H5 网页版..."
    cd "${MINI_DIR}"
    npm run build:h5
    log_success "H5 页面构建完成 (miniprogram/dist/build/h5)"

    cd "${PROJECT_ROOT}"
    log_success "全量工程静态资源构建成功！"
}

# 5. 使用 PM2 启动或平滑重启后端服务
start_pm2() {
    log_info "正在配置与启动后端守护进程..."
    if ! command -v pm2 &> /dev/null; then
        log_warn "未检测到全局 PM2，尝试通过 npx pm2 运行..."
        PM2_CMD="npx pm2"
    else
        PM2_CMD="pm2"
    fi

    cd "${PROJECT_ROOT}"
    # 尝试重载或启动
    ${PM2_CMD} startOrRestart ecosystem.config.cjs --env production
    ${PM2_CMD} save || true
    log_success "后端 API 服务已通过 PM2 启动/重启并纳入后台守护！"
}

# 6. 停止 PM2
stop_pm2() {
    log_info "正在停止后端服务..."
    if command -v pm2 &> /dev/null; then
        pm2 stop ecosystem.config.cjs || true
    else
        npx pm2 stop ecosystem.config.cjs || true
    fi
    log_success "服务已停止！"
}

# 7. 重启 PM2
restart_pm2() {
    log_info "正在重启后端服务..."
    if command -v pm2 &> /dev/null; then
        pm2 restart ecosystem.config.cjs --env production
    else
        npx pm2 restart ecosystem.config.cjs --env production
    fi
    log_success "服务已平滑重启！"
}

# 8. 查看状态与健康检查
check_status() {
    print_banner
    log_info "服务运行状态查看："
    if command -v pm2 &> /dev/null; then
        pm2 list
    else
        npx pm2 list
    fi

    echo ""
    log_info "正在执行后端 API 健康探针 (http://127.0.0.1:3000/health)..."
    if curl -s -f http://127.0.0.1:3000/health > /dev/null; then
        HEALTH_RES=$(curl -s http://127.0.0.1:3000/health)
        log_success "健康探针检测正常! 响应数据: ${HEALTH_RES}"
    else
        log_warn "健康探针未能返回 200，服务可能尚未就绪或端口冲突。"
    fi
}

# 9. Docker 模式一键部署
deploy_docker() {
    print_banner
    log_info "检测到执行 Docker 模式部署..."

    if ! command -v docker &> /dev/null; then
        log_error "未安装 Docker，请先安装 Docker 及 Docker Compose！"
        exit 1
    fi

    log_info "先编译前端与 H5 生产产物..."
    cd "${ADMIN_DIR}" && npm run build
    cd "${MINI_DIR}" && npm run build:h5
    cd "${PROJECT_ROOT}"

    log_info "启动 Docker Compose 编排服务..."
    docker compose up -d --build

    log_success "Docker 容器集群已在后台启动！"
    echo -e "${GREEN}H5 访问地址:      http://localhost:80${NC}"
    echo -e "${GREEN}管理后台地址:     http://localhost:8080${NC}"
    echo -e "${GREEN}后端 API 地址:     http://localhost:3000${NC}"
}

# 打印完成与 Nginx 配置提示
print_completion_guide() {
    echo ""
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${GREEN}🎉 《心芒灵境》一键部署操作已完成！${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "🔹 ${CYAN}后端 API 服务：${NC} http://127.0.0.1:3000 (已由 PM2 守护)"
    echo -e "🔹 ${CYAN}管理后台构建物：${NC} ${ADMIN_DIR}/dist"
    echo -e "🔹 ${CYAN}小程序H5构建物：${NC} ${MINI_DIR}/dist/build/h5"
    echo -e "🔹 ${CYAN}日志输出目录：  ${NC} ${LOGS_DIR}/"
    echo ""
    echo -e "📌 ${YELLOW}生产环境 Nginx 接入推荐：${NC}"
    echo -e "   已为您生成生产级 Nginx 配置模板：${CYAN}deploy/nginx/xinmang.conf${NC}"
    echo -e "   将配置中的路径软链或复制至 /etc/nginx/conf.d/ 即可一键启用端口或域名映射与大模型 SSE 流式输出优化。"
    echo -e "${PURPLE}================================================================${NC}"
}

# 主执行分发
ACTION="${1:-all}"

case "${ACTION}" in
    all)
        print_banner
        check_environment
        install_dependencies
        prepare_database
        build_all
        start_pm2
        check_status
        print_completion_guide
        ;;
    build)
        print_banner
        check_environment
        install_dependencies
        prepare_database
        build_all
        ;;
    start)
        start_pm2
        check_status
        ;;
    stop)
        stop_pm2
        ;;
    restart)
        restart_pm2
        check_status
        ;;
    status)
        check_status
        ;;
    docker)
        deploy_docker
        ;;
    help|--help|-h)
        print_banner
        echo "使用方法: ./deploy.sh [命令]"
        echo ""
        echo "可用命令:"
        echo "  all       (默认) 完整一键部署：依赖检查 -> 数据库同步 -> 全量打包 -> PM2启动"
        echo "  build     仅执行依赖安装与全量静态资源打包构建 (server, admin, h5)"
        echo "  start     使用 PM2 启动生产环境后端服务"
        echo "  stop      停止 PM2 运行中的后端服务"
        echo "  restart   平滑重启 PM2 后端服务"
        echo "  status    查看服务进程状态与健康检查探针"
        echo "  docker    一键构建并通过 Docker Compose 启动容器化集群"
        echo "  help      显示此帮助信息"
        ;;
    *)
        log_error "未知指令: ${ACTION}，输入 ./deploy.sh help 查看帮助。"
        exit 1
        ;;
esac
