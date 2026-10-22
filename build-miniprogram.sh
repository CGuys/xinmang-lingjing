#!/usr/bin/env bash

# ==============================================================================
# 《心芒灵境》微信小程序多环境打包构建脚本
# 支持：生产环境（云端体验版/正式版）、开发环境（本地局域网联调）、测试环境
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINI_DIR="${PROJECT_ROOT}/miniprogram"

# 终端色彩常量
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${PURPLE}${BOLD}"
echo "================================================================"
echo "    🔮 《心芒灵境》微信小程序多环境构建打包工具 🔮             "
echo "================================================================"
echo -e "${NC}"

TARGET_ENV="$1"

if [ -z "$TARGET_ENV" ]; then
    echo -e "${YELLOW}请选择需要构建的目标环境：${NC}"
    echo "  1) 生产环境 / 云端体验版 (production  -> http://8.148.201.178)"
    echo "  2) 本地开发环境 (development -> http://192.168.110.41:3000)"
    echo "  3) 独立测试环境 (test        -> http://8.148.201.178)"
    echo ""
    read -p "请输入序号 [1/2/3] (默认: 1 - 生产环境): " CHOICE
    case "$CHOICE" in
        2)
            TARGET_ENV="dev"
            ;;
        3)
            TARGET_ENV="test"
            ;;
        *)
            TARGET_ENV="prod"
            ;;
    esac
fi

# 格式化环境名称与映射
case "$TARGET_ENV" in
    prod|production|online)
        BUILD_MODE="production"
        ENV_NAME="生产环境 / 云端体验版"
        EXPECTED_API="http://8.148.201.178"
        ;;
    dev|development|local)
        BUILD_MODE="development"
        ENV_NAME="本地局域网开发环境"
        EXPECTED_API="http://192.168.110.41:3000"
        ;;
    test|staging)
        BUILD_MODE="test"
        ENV_NAME="独立测试环境"
        EXPECTED_API="http://8.148.201.178"
        ;;
    *)
        echo -e "${RED}[ERROR] 未知的环境参数: ${TARGET_ENV}${NC}"
        echo -e "支持的参数: ${CYAN}prod${NC} | ${CYAN}dev${NC} | ${CYAN}test${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}----------------------------------------------------------------${NC}"
echo -e " 🎯 目标环境: ${BOLD}${GREEN}${ENV_NAME} (${BUILD_MODE})${NC}"
echo -e " 📡 预设 API 地址: ${BOLD}${YELLOW}${EXPECTED_API}${NC}"
echo -e "${CYAN}----------------------------------------------------------------${NC}"

cd "${MINI_DIR}"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[!] 检测到未安装依赖，正在执行 npm install...${NC}"
    npm install
fi

echo -e "\n${CYAN}🚀 开始构建微信小程序代码产物 (uni build -p mp-weixin --mode ${BUILD_MODE})...${NC}"
npm run "build:mp-weixin:${TARGET_ENV//production/prod}" 2>/dev/null || npx uni build -p mp-weixin --mode "${BUILD_MODE}"

OUTPUT_DIR="${MINI_DIR}/dist/build/mp-weixin"

if [ -d "${OUTPUT_DIR}" ]; then
    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD} 🎉 微信小程序 [${ENV_NAME}] 打包构建成功！${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e " 📂 产物目录: ${CYAN}${OUTPUT_DIR}${NC}"
    echo ""
    echo -e "${BOLD}📱 微信开发者工具操作指引：${NC}"
    echo "  1. 打开【微信开发者工具】-> 导入目录选择："
    echo -e "     ${CYAN}${OUTPUT_DIR}${NC}"
    echo "  2. 点击右上角【上传】提交代码至微信小程序后台；"
    echo "  3. 登录微信公众平台后台，将此版本设为【体验版】；"
    if [ "$BUILD_MODE" == "production" ] || [ "$BUILD_MODE" == "test" ]; then
        echo -e "  4. ${YELLOW}提示：若使用 HTTP 且尚未配置备案域名，真机体验版需点击右上角「···」->「开启调试」即可正常请求公网云服务！${NC}"
    else
        echo -e "  4. ${YELLOW}提示：本地开发版请确保手机与电脑在同一 Wi-Fi，且勾选开发者工具「不校验合法域名」！${NC}"
    fi
    echo ""
else
    echo -e "\n${RED}[ERROR] 构建失败，未找到输出目录: ${OUTPUT_DIR}${NC}"
    exit 1
fi
