#!/bin/bash

# Cloudflare Workers 快速部署腳本

set -e

echo "🚀 開始部署到 Cloudflare Workers..."

# 檢查 wrangler 是否安裝
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安裝"
    echo "安裝: npm install -g wrangler"
    exit 1
fi

# 檢查 Node.js 依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴..."
    npm install
fi

# 檢查 wrangler.toml
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 未找到 wrangler.toml"
    exit 1
fi

# 驗證 Hyperdrive ID 是否已配置
if grep -q "YOUR_HYPERDRIVE_ID" wrangler.toml; then
    echo "⚠️  警告: wrangler.toml 中的 Hyperdrive ID 未配置"
    echo "請編輯 wrangler.toml 並將 'YOUR_HYPERDRIVE_ID' 替換為實際的 ID"
    exit 1
fi

# 選擇環境
echo ""
echo "選擇部署環境："
echo "1. 開發環境 (dev)"
echo "2. 生產環境 (production)"
read -p "輸入選擇 (1 或 2): " env_choice

if [ "$env_choice" = "1" ]; then
    ENV="development"
    echo "📍 正在部署到開發環境..."
    wrangler dev
elif [ "$env_choice" = "2" ]; then
    ENV="production"
    echo "📍 正在部署到生產環境..."
    wrangler deploy --env production
else
    echo "❌ 無效選擇"
    exit 1
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "檢查部署狀態："
echo "wrangler tail"
