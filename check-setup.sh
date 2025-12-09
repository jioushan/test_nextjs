#!/bin/bash

# Cloudflare Workers - PostgreSQL 驅動設置檢查

echo "🔍 Cloudflare Workers 設置檢查..."
echo ""

# 1. 檢查 Wrangler
echo "1️⃣  檢查 Wrangler CLI..."
if command -v wrangler &> /dev/null; then
    echo "   ✅ Wrangler 已安裝: $(wrangler --version)"
else
    echo "   ❌ Wrangler 未安裝"
    echo "   安裝: npm install -g wrangler"
    exit 1
fi

echo ""

# 2. 檢查 Node.js
echo "2️⃣  檢查 Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js 已安裝: $(node --version)"
else
    echo "   ❌ Node.js 未安裝"
    exit 1
fi

echo ""

# 3. 檢查必要的文件
echo "3️⃣  檢查必要的文件..."
files=("wrangler.toml" "src/index.ts" "tsconfig.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file 不存在"
    fi
done

echo ""

# 4. 檢查 node_modules
echo "4️⃣  檢查依賴..."
if [ -d "node_modules" ]; then
    echo "   ✅ 依賴已安裝"
else
    echo "   ⚠️  依賴未安裝，正在安裝..."
    npm install
fi

echo ""

# 5. 檢查 Hyperdrive 配置
echo "5️⃣  檢查 Hyperdrive 配置..."
if grep -q "YOUR_HYPERDRIVE_ID" wrangler.toml; then
    echo "   ⚠️  Hyperdrive ID 未配置"
    echo "   請編輯 wrangler.toml 並將 YOUR_HYPERDRIVE_ID 替換為實際 ID"
else
    echo "   ✅ Hyperdrive ID 已配置"
fi

echo ""

# 6. 檢查 Cloudflare 登錄
echo "6️⃣  檢查 Cloudflare 登錄..."
if wrangler whoami &>/dev/null; then
    echo "   ✅ 已登錄 Cloudflare"
    wrangler whoami | grep -E "^Account" | sed 's/^/   /'
else
    echo "   ❌ 未登錄 Cloudflare"
    echo "   執行: wrangler login"
fi

echo ""
echo "✅ 檢查完成！"
echo ""
echo "下一步："
echo "1. 確認所有檢查項都通過"
echo "2. 配置 Hyperdrive ID（如果尚未配置）"
echo "3. 運行: wrangler dev (本地開發)"
echo "4. 運行: wrangler deploy (部署到生產)"
