#!/bin/bash
# Savor PM2 启动脚本

cd "$(dirname "$0")/.."

echo "[Savor] 启动服务..."

# 确保目录存在
mkdir -p logs data/archive

# 使用 PM2 启动
pm2 start ecosystem.config.js

echo "[Savor] 服务已启动"
echo "查看状态: pm2 status"
echo "查看日志: pm2 logs savor"
echo "停止服务: ./bin/pm2-stop.sh"
