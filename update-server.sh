#!/usr/bin/env bash

# ==============================================================================
# 《心芒灵境》代码更新与一键推送到云服务器工具
# ==============================================================================

set -e

SERVER_IP="8.148.201.178"
SERVER_PASS="Aa123456"
REMOTE_DIR="/opt/xinmang-lingjing"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "================================================================"
echo "    🚀 《心芒灵境》代码更新部署工具 -> ${SERVER_IP}    "
echo "================================================================"
echo -e "${NC}"

MODE="${1:-all}"

# 1. 编译前端构建物
if [ "$MODE" == "all" ] || [ "$MODE" == "front" ] || [ "$MODE" == "admin" ]; then
    echo -e "${CYAN}[1/4] 编译运营管理后台 (admin)...${NC}"
    cd "${PROJECT_ROOT}/admin" && npm run build
fi

if [ "$MODE" == "all" ] || [ "$MODE" == "front" ] || [ "$MODE" == "h5" ]; then
    echo -e "${CYAN}[2/4] 编译小程序 H5 网页版 (miniprogram)...${NC}"
    cd "${PROJECT_ROOT}/miniprogram" && npm run build:h5
fi

# 2. 打包需要更新的文件
echo -e "${CYAN}[3/4] 打包更新文件...${NC}"
TMP_TAR="/tmp/xinmang_update.tar.gz"
cd "${PROJECT_ROOT}"

# 排除体积庞大的 node_modules 和 .git，保留源码、配置和构建物
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='dev.db*' \
    -czf "${TMP_TAR}" \
    server \
    admin \
    miniprogram \
    deploy \
    docker-compose.yml

# 3. 推送并执行远程更新
echo -e "${CYAN}[4/4] 上传到云服务器并热重启...${NC}"

expect -c "
set timeout 300
spawn scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${TMP_TAR} root@${SERVER_IP}:/tmp/xinmang_update.tar.gz
expect {
    \"password:\" {
        send \"${SERVER_PASS}\r\"
        exp_continue
    }
    eof
}
"

expect -c "
set timeout 300
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${SERVER_IP} \"
    cd ${REMOTE_DIR}
    tar -xzf /tmp/xinmang_update.tar.gz -C ${REMOTE_DIR}
    rm -f /tmp/xinmang_update.tar.gz
    find ${REMOTE_DIR} -name '._*' -delete

    # 热更新 Nginx 静态文件
    docker exec xinmang-web nginx -s reload || true

    # 如果有后端更新，重构并重启后端服务容器 (MySQL 和 Redis 数据不受影响)
    docker compose up -d --build server
\"
expect {
    \"password:\" {
        send \"${SERVER_PASS}\r\"
        exp_continue
    }
    eof
}
"

rm -f "${TMP_TAR}"

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✨ 代码已成功更新至云服务器！${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "🔹 H5 客户端：       http://${SERVER_IP}/"
echo -e "🔹 运营管理后台：   http://${SERVER_IP}:8080/"
echo -e "🔹 API 健康检查：    http://${SERVER_IP}:3000/health"
