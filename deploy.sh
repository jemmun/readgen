#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-80}"

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ReadGen 一键部署 (前端 + 后端)    ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ---------- 检查 Docker ----------
info "检查 Docker 环境..."
if ! command -v docker &>/dev/null; then
    err "未安装 Docker，请先安装：curl -fsSL https://get.docker.com | sh"
    exit 1
fi
ok "Docker: $(docker --version)"

if ! docker info &>/dev/null; then
    err "Docker 未运行或无权限，请执行: sudo systemctl start docker"
    exit 1
fi
ok "Docker 守护进程运行中"

# ---------- 检查 docker-compose ----------
if command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &>/dev/null; then
    COMPOSE="docker compose"
else
    err "未找到 docker-compose"
    exit 1
fi
ok "Docker Compose: $COMPOSE"

# ---------- 检查 .env ----------
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    warn "未找到 backend/.env，后端将以默认配置启动"
fi

# ---------- 操作菜单 ----------
echo ""
echo "  选择操作："
echo "    1) 构建并启动 (首次部署)"
echo "    2) 启动"
echo "    3) 停止"
echo "    4) 重启"
echo "    5) 查看日志"
echo "    6) 查看状态"
echo "    7) 仅重启后端"
echo "    8) 仅重启前端"
echo "    9) 停止并删除所有容器"
echo ""
read -rp "  请输入选项 [1-9]: " choice

cd "$PROJECT_DIR"

case $choice in
    1)
        info "构建镜像 (前后端)..."
        $COMPOSE build --no-cache
        info "启动容器..."
        $COMPOSE up -d
        ok "部署完成"
        ;;
    2)
        info "启动容器..."
        $COMPOSE up -d
        ok "容器已启动"
        ;;
    3)
        info "停止容器..."
        $COMPOSE stop
        ok "容器已停止"
        ;;
    4)
        info "重启所有容器..."
        $COMPOSE restart
        ok "容器已重启"
        ;;
    5)
        info "查看日志 (Ctrl+C 退出)..."
        $COMPOSE logs -f --tail=100
        ;;
    6)
        $COMPOSE ps
        ;;
    7)
        info "重启后端..."
        $COMPOSE up -d --no-deps --build backend
        ok "后端已重启"
        ;;
    8)
        info "重启前端..."
        $COMPOSE up -d --no-deps --build frontend
        ok "前端已重启"
        ;;
    9)
        warn "将删除容器和数据卷..."
        read -rp "  确认删除? [y/N]: " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            $COMPOSE down -v
            ok "已删除"
        else
            info "已取消"
        fi
        ;;
    *)
        err "无效选项"
        exit 1
        ;;
esac

echo ""
echo -e "  ┌────────────────────────────────────────────┐"
echo -e "  │  前端:     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  │  API:      ${GREEN}http://localhost:${FRONTEND_PORT}/api/${NC}"
echo -e "  │  Swagger:  ${GREEN}http://localhost:${FRONTEND_PORT}/api/docs${NC}"
echo -e "  │  健康:     ${GREEN}http://localhost:${FRONTEND_PORT}/api/health${NC}"
echo -e "  └────────────────────────────────────────────┘"
