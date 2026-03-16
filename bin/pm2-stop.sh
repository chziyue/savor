#!/bin/bash
# Savor PM2 停止脚本

cd "$(dirname "$0")/.."

echo "[Savor] 停止服务..."
pm2 stop savor
echo "[Savor] 服务已停止"
