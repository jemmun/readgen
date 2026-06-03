#!/bin/bash

# ReadGen 后端一键启动脚本
# 用法: ./start-backend.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"
HOST="${BACKEND_HOST:-0.0.0.0}"
PORT="${BACKEND_PORT:-8000}"
RELOAD="${BACKEND_RELOAD:-true}"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}  ReadGen 后端启动脚本${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --host HOST        设置主机地址 (默认: 0.0.0.0)"
    echo "  --port PORT        设置端口号 (默认: 8000)"
    echo "  --no-reload        禁用自动重载"
    echo "  --help, -h         显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                           # 使用默认配置启动"
    echo "  $0 --port 3000               # 在3000端口启动"
    echo "  $0 --host 127.0.0.1 --port 8080  # 指定主机和端口"
    echo ""
    echo "环境变量:"
    echo "  BACKEND_HOST     主机地址 (覆盖 --host)"
    echo "  BACKEND_PORT     端口号 (覆盖 --port)"
    echo "  BACKEND_RELOAD   是否自动重载 (true/false)"
    echo ""
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --no-reload)
            RELOAD="false"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查是否在后端目录
if [ ! -f "$BACKEND_DIR/app/main.py" ]; then
    print_error "请在后端目录中运行此脚本"
    print_error "找不到 app/main.py 文件"
    exit 1
fi

print_info "====================================="
print_info "  ReadGen 后端启动"
print_info "====================================="
echo ""

# 1. 检查Python环境
print_info "检查 Python 环境..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    print_success "Python 已安装: $PYTHON_VERSION"
else
    print_error "未找到 Python3，请先安装 Python 3.8+"
    exit 1
fi

# 2. 创建或激活虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    print_info "创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
    print_success "虚拟环境创建成功"
else
    print_success "虚拟环境已存在"
fi

# 激活虚拟环境
print_info "激活虚拟环境..."
source "$VENV_DIR/bin/activate"
print_success "虚拟环境已激活"
echo ""

# 3. 安装依赖
# print_info "检查依赖..."
# if [ ! -f "$VENV_DIR/lib/python*/site-packages/fastapi/__init__.py" ]; then
#     print_info "安装依赖包 (首次运行可能需要几分钟)..."
#     $PIP install --upgrade pip -q
#     $PIP install -r "$BACKEND_DIR/requirements.txt" -q
#     print_success "依赖安装完成"
# else
#     # 检查是否有新的依赖需要安装
#     if [ -f "$BACKEND_DIR/requirements.txt" ]; then
#         print_info "检查依赖更新..."
#         $PIP install -r "$BACKEND_DIR/requirements.txt" -q --upgrade 2>/dev/null || true
#     fi
#     print_success "依赖已是最新"
# fi
# echo ""

# 4. 检查数据库
print_info "检查数据库..."
if [ ! -f "$BACKEND_DIR/app.db" ]; then
    print_warning "数据库文件不存在，将自动创建"
fi
print_success "数据库检查完成"
echo ""

# 5. 检查环境变量文件
if [ -f "$BACKEND_DIR/.env" ]; then
    print_info "加载环境变量 (.env)..."
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
    print_success "环境变量已加载"
    echo ""
fi

# 6. 显示启动配置
print_info "====================================="
print_info "  启动配置"
print_info "====================================="
echo -e "  主机: ${GREEN}$HOST${NC}"
echo -e "  端口: ${GREEN}$PORT${NC}"
echo -e "  自动重载: ${GREEN}$RELOAD${NC}"
echo -e "  访问地址: ${GREEN}http://$HOST:$PORT${NC}"
echo -e "  API文档: ${GREEN}http://$HOST:$PORT/docs${NC}"
echo "====================================="
echo ""

# 7. 启动应用
print_info "启动 FastAPI 服务器..."
echo ""

RELOAD_FLAG=""
if [ "$RELOAD" = "true" ]; then
    RELOAD_FLAG="--reload"
fi

# 启动服务器
exec uvicorn app.main:app \
    --host "$HOST" \
    --port "$PORT" \
    $RELOAD_FLAG \
    --log-level info
