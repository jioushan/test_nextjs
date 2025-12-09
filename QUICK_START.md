# 快速開始

## 1️⃣ 準備工作

### 安裝必要工具
```bash
npm install -g @cloudflare/wrangler
npm install
```

### 登錄 Cloudflare
```bash
wrangler login
```

## 2️⃣ 配置 Hyperdrive

1. 登錄 [Cloudflare 儀表板](https://dash.cloudflare.com)
2. 進入 Workers & Pages > 你的項目
3. 找到 Hyperdrive 部分，創建新的數據庫連接
4. 複製 Hyperdrive ID
5. 在 `wrangler.toml` 中的 `YOUR_HYPERDRIVE_ID` 替換為實際 ID

## 3️⃣ 本地開發

```bash
# 啟動本地開發服務器
wrangler dev

# 訪問 http://localhost:8787/api/health
```

## 4️⃣ 部署

```bash
# 部署到生產環境
wrangler deploy

# 部署到特定環境
wrangler deploy --env production
```

## 5️⃣ 測試 API

### 使用 curl
```bash
# 健康檢查
curl https://your-worker.workers.dev/api/health

# 獲取表列表
curl https://your-worker.workers.dev/api/tables

# 執行查詢
curl -X POST https://your-worker.workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM users LIMIT 5"}'
```

### 使用 JavaScript
```javascript
const response = await fetch('https://your-worker.workers.dev/api/health');
const data = await response.json();
console.log(data);
```

## 📁 項目結構

```
src/
├── index.ts      # Worker 主程序
├── client.ts     # 客戶端示例
└── types.d.ts    # 類型定義

wrangler.toml    # Worker 配置
package.json     # 依賴管理
tsconfig.json    # TypeScript 配置
```

## 🔗 有用的命令

```bash
# 查看日誌
wrangler tail

# 本地開發（帶監視）
wrangler dev --local

# 乾運行（檢查不部署）
wrangler deploy --dry-run

# 列出所有 Workers
wrangler list

# 刪除 Worker
wrangler delete <name>
```

## 🐛 常見問題

### 連接 Hyperdrive 失敗
- 檢查 ID 是否正確
- 確保數據庫接受連接
- 查看 `wrangler tail` 的詳細錯誤

### 模塊找不到
```bash
npm install --save-dev @types/pg
npm install pg
```

### 部署失敗
- 檢查 `wrangler login` 是否成功
- 驗證 `wrangler.toml` 格式
- 使用 `wrangler publish --dry-run` 檢查

## 📚 更多信息

詳見 [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)
