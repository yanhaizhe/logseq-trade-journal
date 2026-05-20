#!/bin/bash
# Trade Journal 项目启动脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. 启动后端数据服务
echo "🚀 正在启动后端数据服务..."
bash "$SCRIPT_DIR/scripts/data-service.sh" start

# 2. 启动前端 Vite 服务
# echo "🚀 正在启动前端开发服务器..."
# cd "$SCRIPT_DIR"
# npm run dev
