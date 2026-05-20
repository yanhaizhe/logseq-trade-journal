#!/bin/bash
# Trade Journal 项目停止脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 停止后端数据服务
echo "🛑 正在停止后端数据服务..."
bash "$SCRIPT_DIR/scripts/data-service.sh" stop

echo "✅ 停止完毕！"
