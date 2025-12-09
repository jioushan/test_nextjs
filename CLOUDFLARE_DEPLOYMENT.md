# Cloudflare Workers + Hyperdrive PostgreSQL 部署指南

## 📋 項目結構

```
next-postgres-form/
├── src/
│   ├── index.ts          # Worker 主程序
│   └── types.d.ts        # TypeScript 類型定義
├── wrangler.toml         # Cloudflare Workers 配置
├── package.json          # Next.js 依賴
├── package-worker.json   # Workers 依賴（複製為 package.json 使用）
└── tsconfig.json         # TypeScript 配置
```

## 🚀 快速開始

### 1. 安裝 Wrangler CLI

```bash
npm install -g @cloudflare/wrangler
# 或者
npm install --save-dev wrangler
```

### 2. 登錄 Cloudflare

```bash
wrangler login
```

### 3. 創建 Hyperdrive 連接

在 Cloudflare 儀表板中：
1. 進入 **Workers & Pages**
2. 選擇你的項目
3. 進入 **Hyperdrive** 標籤
4. 點擊 **Create Hyperdrive Database**
5. 填寫你的 PostgreSQL 連接詳情：
   - **Host**: 你的數據庫主機
   - **Port**: 5432（或你的端口）
   - **User**: PostgreSQL 用戶名
   - **Password**: PostgreSQL 密碼
   - **Database**: 數據庫名稱

### 4. 更新 wrangler.toml

在 `wrangler.toml` 中替換 Hyperdrive ID：

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "YOUR_HYPERDRIVE_ID"  # 用你的實際 ID 替換
```

### 5. 本地開發

```bash
# 安裝依賴（使用 Workers 配置）
npm install --save-dev wrangler typescript @types/node @types/pg

# 本地開發服務器
wrangler dev
```

本地服務器將運行在 `http://localhost:8787`

### 6. 部署到 Cloudflare

```bash
wrangler deploy
```

## 📡 API 端點

部署後，你的 Worker 將提供以下端點：

### 1. 健康檢查
```
GET /api/health
```

**響應示例：**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T10:30:00.000Z"
}
```

### 2. 獲取所有表
```
GET /api/tables
```

**響應示例：**
```json
{
  "success": true,
  "tables": [
    {
      "table_schema": "public",
      "table_name": "users"
    },
    {
      "table_schema": "public",
      "table_name": "products"
    }
  ]
}
```

### 3. 執行自定義查詢
```
POST /api/query
Content-Type: application/json

{
  "query": "SELECT * FROM users WHERE id = 1"
}
```

**響應示例：**
```json
{
  "success": true,
  "rowCount": 1,
  "rows": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

## 🔒 安全考慮

1. **查詢限制**：防止執行危險命令（DROP, TRUNCATE, DELETE）
2. **CORS 配置**：允許來自任何來源的請求（可根據需要修改）
3. **環境變量**：敏感信息通過 Hyperdrive 綁定安全傳遞
4. **連接管理**：使用 `ctx.waitUntil()` 確保連接正確關閉

## 🛠️ 環境配置

### 開發環境
```bash
wrangler dev --env development
```

### 生產環境
```bash
wrangler deploy --env production
```

## 📝 示例：與 Next.js 前端集成

```typescript
// pages/index.js 或 components/Database.jsx
const fetchTables = async () => {
  const response = await fetch('https://your-worker.workers.dev/api/tables');
  const data = await response.json();
  console.log(data.tables);
};

const executeQuery = async (query: string) => {
  const response = await fetch('https://your-worker.workers.dev/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return response.json();
};
```

## 🐛 故障排查

### 連接超時
- 確保 Hyperdrive 配置正確
- 檢查數據庫防火牆規則
- 驗證連接字符串

### 模塊未找到
```bash
npm install --save-dev @types/pg
```

### 部署失敗
```bash
# 檢查部署日誌
wrangler tail

# 驗證配置
wrangler publish --dry-run
```

## 📊 監控和日誌

```bash
# 實時查看日誌
wrangler tail

# 查看分析
wrangler analytics
```

## 🔄 更新部署

每次修改代碼後：

```bash
# 重新部署
wrangler deploy

# 或使用別名
wrangler deploy --env production
```

## 💡 進階用法

### 使用 KV 存儲緩存查詢結果

```typescript
// 在 wrangler.toml 中添加
[[kv_namespaces]]
binding = "CACHE"
id = "your_kv_id"

// 在代碼中使用
const cached = await env.CACHE.get(`query:${hash}`);
if (cached) return JSON.parse(cached);
```

### 添加認證

```typescript
const token = request.headers.get('Authorization');
if (token !== `Bearer ${env.API_TOKEN}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## 📚 相關資源

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Hyperdrive 文檔](https://developers.cloudflare.com/hyperdrive/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
- [pg 包文檔](https://node-postgres.com/)

## 📞 支持

如有問題，請檢查：
1. Cloudflare 儀表板狀態
2. Worker 日誌 (`wrangler tail`)
3. Hyperdrive 連接配置
4. 防火牆和網絡設置
