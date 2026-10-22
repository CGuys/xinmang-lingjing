#!/usr/bin/env bash

# ==============================================================================
# 《心芒灵境》本地一键更新、编译与服务启停工具
# 支持：全量本地编译、微信小程序代码生成、本地三端服务后台拉起与健康检查
# ==============================================================================

set -e

# 终端色彩常量
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 目录路径定义
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
    echo -e "${PURPLE}${BOLD}"
    echo "================================================================"
    echo "       🔮 《心芒灵境》本地一键更新与本地部署工具 🔮            "
    echo "================================================================"
    echo -e "${NC}"
}

# 1. 检查基础环境依赖
check_environment() {
    log_info "正在检查本地运行基础环境..."
    
    if ! command -v node &> /dev/null; then
        log_error "未检测到 Node.js，请先安装 Node.js (>= 18)！"
        exit 1
    fi
    log_success "Node.js 环境就绪: $(node -v)"

    if ! command -v npm &> /dev/null; then
        log_error "未检测到 npm 命令！"
        exit 1
    fi
    log_success "npm 环境就绪: v$(npm -v)"

    # 检查本地 MySQL 端口 3306
    if lsof -i :3306 > /dev/null 2>&1; then
        log_success "MySQL 数据库服务运行正常 (端口 3306)"
    else
        log_warn "未检测到端口 3306 监听，请确认本地 MySQL 是否已启动！"
    fi

    # 检查本地 Redis 端口 6379
    if lsof -i :6379 > /dev/null 2>&1; then
        log_success "Redis 缓存服务运行正常 (端口 6379)"
    else
        log_warn "未检测到端口 6379 监听，请确认本地 Redis 是否已启动！"
    fi

    # 检查 server/.env
    if [ ! -f "${SERVER_DIR}/.env" ]; then
        if [ -f "${SERVER_DIR}/.env.example" ]; then
            log_warn "未发现 server/.env，正在从 .env.example 复制生成配置..."
            cp "${SERVER_DIR}/.env.example" "${SERVER_DIR}/.env"
        fi
    fi
}

# 2. 同步安装依赖并配置 Prisma
prepare_packages_and_db() {
    log_info "检查并同步项目依赖与数据库模型..."

    # 服务端
    cd "${SERVER_DIR}"
    if [ ! -d "node_modules" ]; then
        log_info ">> 安装后端依赖 (server)..."
        npm install
    fi
    log_info ">> 生成 Prisma Client 并同步数据表..."
    npx prisma generate
    npx prisma db push --accept-data-loss --skip-generate || true

    # 运营后台
    cd "${ADMIN_DIR}"
    if [ ! -d "node_modules" ]; then
        log_info ">> 安装运营管理后台依赖 (admin)..."
        npm install
    fi

    # 小程序端
    cd "${MINI_DIR}"
    if [ ! -d "node_modules" ]; then
        log_info ">> 安装小程序端依赖 (miniprogram)..."
        npm install
    fi

    cd "${PROJECT_ROOT}"
    log_success "依赖与数据库结构同步完成！"
}

# 3. 编译构建全量工程
build_artifacts() {
    log_info "开始重新编译三端静态产物..."

    # 1. 运营后台编译
    log_info ">> [1/3] 编译 Web 运营管理后台 (admin)..."
    cd "${ADMIN_DIR}"
    npm run build
    log_success "运营管理后台编译完成 -> admin/dist"

    # 2. 小程序编译 (同时编译微信小程序原生目录与 H5 预览)
    log_info ">> [2/3] 编译微信小程序产物 (mp-weixin)..."
    cd "${MINI_DIR}"
    npm run build:mp-weixin
    log_success "微信小程序产物编译完成 -> miniprogram/dist/build/mp-weixin"

    log_info ">> [3/3] 编译小程序 H5 网页版 (h5)..."
    npm run build:h5
    log_success "小程序 H5 网页版编译完成 -> miniprogram/dist/build/h5"

    cd "${PROJECT_ROOT}"
    log_success "全量工程产物重新编译构建成功！"
}

# 4. 服务启停与状态管理 (基于 Node.js 彻底解除终端会话挂起)
stop_local_services() {
    node "${PROJECT_ROOT}/scripts/manage-local.js" stop
}

start_local_services() {
    node "${PROJECT_ROOT}/scripts/manage-local.js" start
}

restart_local_services() {
    node "${PROJECT_ROOT}/scripts/manage-local.js" restart
}

show_status() {
    node "${PROJECT_ROOT}/scripts/manage-local.js" status
}

# 微信小程序端热开发监听模式
start_mp_dev() {
    print_banner
    log_info "正在启动微信小程序专属热更新编译模式 (dev:mp-weixin)..."
    log_info "代码保存后微信开发者工具将即时热更新！按 Ctrl+C 可退出监听。"
    cd "${MINI_DIR}"
    npm run dev:mp-weixin
}

# 帮助说明
show_help() {
    print_banner
    echo "用法: $0 [all|build|start|stop|restart|status|dev:mp|help]"
    echo ""
    echo "可用命令说明："
    echo -e "  ${GREEN}$0 或 $0 all${NC}   一键全流程：环境检查 -> 同步数据库 -> 全量编译三端产物 -> 启动本地后台服务"
    echo -e "  ${GREEN}$0 build${NC}          仅全量编译三端产物（小程序 mp-weixin、H5、Admin、后端）"
    echo -e "  ${GREEN}$0 start${NC}          直接启动本地三端服务（不重新编译）"
    echo -e "  ${GREEN}$0 stop${NC}           一键安全停止本地所有服务端口（3000 / 5173 / 5174）"
    echo -e "  ${GREEN}$0 restart${NC}        一键停止并重启本地三端服务"
    echo -e "  ${GREEN}$0 status${NC}         查看本地三端服务端口、探针与运行状态"
    echo -e "  ${GREEN}$0 dev:mp${NC}        启动微信小程序热更新实时监听编译模式 (支持微信开发者工具热重载)"
    echo -e "  ${GREEN}$0 help${NC}           查看帮助说明"
    echo ""
}

# 命令分发入口
ACTION="${1:-all}"

case "${ACTION}" in
    all)
        print_banner
        check_environment
        prepare_packages_and_db
        build_artifacts
        stop_local_services
        start_local_services
        ;;
    build)
        print_banner
        check_environment
        build_artifacts
        ;;
    start)
        print_banner
        check_environment
        stop_local_services
        start_local_services
        ;;
    stop)
        print_banner
        stop_local_services
        ;;
    restart)
        print_banner
        stop_local_services
        start_local_services
        ;;
    status)
        show_status
        ;;
    dev:mp)
        start_mp_dev
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知参数指令: ${ACTION}"
        show_help
        exit 1
        ;;
esac
