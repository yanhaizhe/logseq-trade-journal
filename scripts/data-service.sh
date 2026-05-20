#!/bin/bash
# Trade Journal 数据服务管理脚本
# 启动 Python FastAPI 子项目（支持多市场多数据源）
# 用法: ./data-service.sh {start|stop|status|install}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")/server"
PID_FILE="$SCRIPT_DIR/.dataserver.pid"
LOG_FILE="$SCRIPT_DIR/.dataserver.log"
PORT=${PORT:-8765}
PYTHON="${PYTHON:-python}"

# ========== install ==========
install_deps() {
    echo "🔍 检查 Python 环境..."
    if ! command -v "$PYTHON" &>/dev/null; then
        echo "❌ 未找到 $PYTHON，请先安装 Python 3.9+"
        exit 1
    fi
    echo "   Python: $($PYTHON --version)"

    cd "$SERVER_DIR"
    
    echo "📦 检查关键依赖包..."
    local missing_pkgs=0
    for pkg in fastapi uvicorn akshare yfinance ccxt tushare; do
        if $PYTHON -c "import $pkg" 2>/dev/null; then
            echo "   ✅ $pkg"
        else
            echo "   ❌ $pkg 未安装"
            missing_pkgs=1
        fi
    done

    if [ "$missing_pkgs" -eq 1 ] || [ "$1" = "force" ]; then
        echo "📦 开始安装依赖 (这可能需要一些时间)..."
        "$PYTHON" -m pip install -r requirements.txt
        echo "✅ 依赖安装完成"
    else
        echo "✅ 依赖已就绪"
    fi
}

# ========== start ==========
start_server() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  数据服务已在运行 (PID $pid)"
            return 0
        fi
        rm -f "$PID_FILE"
    fi

    install_deps

    echo "🚀 启动 Trade Journal 数据服务 (端口 $PORT)..."
    cd "$SERVER_DIR"
    nohup env HTTP_PROXY="" HTTPS_PROXY="" ALL_PROXY="" NO_PROXY="*" "$PYTHON" -m uvicorn main:app --host 127.0.0.1 --port "$PORT" > "$LOG_FILE" 2>&1 &
    pid=$!
    echo "$pid" > "$PID_FILE"

    sleep 3
    if kill -0 "$pid" 2>/dev/null; then
        echo "✅ 数据服务已启动 (PID $pid)"
        echo "   API 文档: http://127.0.0.1:$PORT/docs"
        echo "   健康检查: http://127.0.0.1:$PORT/health"
    else
        echo "❌ 启动失败，查看日志: $LOG_FILE"
        tail -20 "$LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# ========== stop ==========
stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  数据服务未运行"
        return 0
    fi

    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo "🛑 停止数据服务 (PID $pid)..."
        curl -s -X POST "http://127.0.0.1:$PORT/shutdown" 2>/dev/null || true
        sleep 1
        kill "$pid" 2>/dev/null || true
        echo "✅ 已停止"
    else
        echo "⚠️  进程已不存在"
    fi
    rm -f "$PID_FILE"
}

# ========== status ==========
status_server() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ 数据服务运行中 (PID $pid, 端口 $PORT)"
            health=$(curl -s "http://127.0.0.1:$PORT/health" 2>/dev/null)
            if [ -n "$health" ]; then
                echo "   $health"
            fi
            return 0
        fi
    fi
    echo "❌ 数据服务未运行"
    return 1
}

# ========== main ==========
case "${1:-status}" in
    start)   start_server ;;
    stop)    stop_server ;;
    status)  status_server ;;
    install) install_deps force ;;
    restart) stop_server; sleep 1; start_server ;;
    *)
        echo "用法: $0 {start|stop|restart|status|install}"
        echo ""
        echo "  start   - 启动数据服务（FastAPI + 多数据源）"
        echo "  stop    - 停止数据服务"
        echo "  restart - 重启"
        echo "  status  - 查看状态"
        echo "  install - 强制重新安装依赖"
        exit 1
        ;;
esac
