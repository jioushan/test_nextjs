# Cloudflare Pages 部署指南（不破壞本地開發）

## 🏗️ 架構設計

```
┌─────────────────────────────────────────┐
│         本地開發 (localhost:3000)       │
│  ├─ 前端：Next.js Pages                 │
│  └─ API：pages/api/submit.js (Node.js)  │
│     連接本地 PostgreSQL                 │
└─────────────────────────────────────────┘

                    ↓ (生產部署)

┌──────────────────────────────────────────────────────┐
│       Cloudflare Pages (靜態前端)                    │
│  ├─ 前端資源：HTML/CSS/JS (靜態)                    │
│  └─ API 端點：https://api-worker-url/api/submit      │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│    Cloudflare Workers (API 後端)                     │
│  ├─ 路由：/api/submit                               │
│  ├─ 資料庫：Hyperdrive (PostgreSQL)                  │
│  └─ Captcha 驗證支援                                │
└──────────────────────────────────────────────────────┘
```

## 📋 本地開發（保持不變）

```bash
# 啟動本地伺服器
npm run dev

# 訪問 http://localhost:3000
# 表單提交使用本地 /api/submit
```

**本地環境變數（`.env` 或 `.env.local`）：**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXT_PUBLIC_2FA_PROVIDER=turnstile
# NEXT_PUBLIC_TURNSTILE_SITEKEY=...（若使用）
# TURNSTILE_SECRET=...（若使用）

# 本地不需要設定 NEXT_PUBLIC_API_URL
# 預設使用 /api/submit
```

## 🚀 生產部署步驟

### 步驟 1：部署 Cloudflare Worker API

首先部署 API 層（處理資料庫連接）：

```bash
# 確保 Hyperdrive ID 在 wrangler.toml 中正確配置
cd ~/Desktop/next-postgres-form

# 部署 Worker
wrangler deploy --env worker

# 部署後會輸出 Worker URL，例如：
# https://next-postgres-form-api.your-account.workers.dev
# 
# 複製並保存這個 URL
```

### 步驟 2：設定 Worker 環境變數

進入 **Cloudflare Dashboard → Workers → next-postgres-form-api → Settings → Variables**

添加以下環境變數（根據你的 Captcha 選擇）：

**若使用 Cloudflare Turnstile：**
```
NEXT_PUBLIC_2FA_PROVIDER = turnstile
NEXT_PUBLIC_TURNSTILE_SITEKEY = your_turnstile_sitekey
TURNSTILE_SECRET = your_turnstile_secret
```

**若使用 Google reCAPTCHA：**
```
NEXT_PUBLIC_2FA_PROVIDER = recaptcha
NEXT_PUBLIC_RECAPTCHA_SITEKEY = your_recaptcha_sitekey
RECAPTCHA_SECRET = your_recaptcha_secret
```

**若不使用 Captcha：**
- 不設定任何以上變數，Worker 會自動跳過 Captcha 驗證

### 步驟 3：構建靜態前端

```bash
# 創建生產環境變數檔案（Cloudflare Pages 構建使用）
cat > .env.production.local << EOF
NEXT_PUBLIC_API_URL=https://next-postgres-form-api.your-account.workers.dev/api/submit
EOF

# 替換上面的 URL 為你的實際 Worker URL

# 構建靜態前端
npm run build

# 檢查是否成功（應輸出 "successfully")
# 靜態檔案會在 .next 目錄中生成
```

### 步驟 4：部署到 Cloudflare Pages

#### 方式 A：使用 Wrangler CLI（最直接）

```bash
# 確保 build 成功後執行
wrangler pages deploy .next
```

#### 方式 B：使用 Git 自動部署（推薦長期）

1. **推送程式碼到 GitHub**
```bash
git add .
git commit -m "chore: prepare for cloudflare pages deployment"
git push
```

2. **在 Cloudflare Dashboard 設定自動部署**
   - 進入 Pages
   - 點擊 "Create a project"
   - 選擇 "Connect to Git"
   - 選擇你的 GitHub repo
   - 設定構建配置：
     - **Build command**: `npm run build`
     - **Build output directory**: `.next`
   - 添加環境變數：
     ```
     NEXT_PUBLIC_API_URL=https://next-postgres-form-api.your-account.workers.dev/api/submit
     ```
   - 點擊 Deploy

3. **之後每次 push 都會自動部署**

## ✅ 驗證部署

### 1. 檢查 Worker 健康狀態

```bash
curl https://next-postgres-form-api.your-account.workers.dev/api/health

# 應回傳：
# {"status":"healthy","timestamp":"2025-12-10T..."}
```

### 2. 訪問前端

```
https://next-postgres-form.pages.dev
```

應該看到你的表單頁面。

### 3. 測試表單提交

1. 填寫表單
2. 點擊 Submit
3. 確認：
   - 前端顯示「已儲存」（若無 Captcha）或完成 Captcha 驗證
   - 數據已插入到 PostgreSQL（透過 Hyperdrive）

## 🔧 環境變數管理

| 環境 | 檔案 | API_URL | 用途 |
|------|------|---------|------|
| 本地開發 | `.env` | `/api/submit` | 本地 Node.js API |
| Pages 生產 | `.env.production.local` | `https://api-worker-url/api/submit` | Cloudflare Worker |

### 切換環境

**本地開發模式：**
```bash
# 使用預設配置（API_URL 為 /api/submit）
npm run dev
```

**生產構建模式：**
```bash
# 設定生產環境變數
export NEXT_PUBLIC_API_URL=https://next-postgres-form-api.your-account.workers.dev/api/submit

# 構建
npm run build

# 部署
wrangler pages deploy .next
```

## 📝 常見問題

### Q: 本地 npm run dev 時出現「API Routes cannot be used」

**A:** 這表示 `next.config.js` 設定了 `output: 'export'`。確保該配置已移除。

### Q: 前端提交時出現「404」或「CORS 錯誤」

**A:** 檢查：
1. Worker 是否已正確部署
2. `NEXT_PUBLIC_API_URL` 環境變數是否正確設定
3. Worker 中的 CORS headers 是否存在

### Q: 資料庫連接失敗

**A:** 檢查：
1. Hyperdrive ID 是否在 `wrangler.toml` 中正確
2. Hyperdrive 連接是否已在 Cloudflare Dashboard 中配置
3. Worker 日誌：`wrangler tail`

### Q: 如何更新生產環境

**A:**
```bash
# 若改了 Worker API
wrangler deploy --env worker

# 若改了前端
git push  # (若使用 Git 自動部署)
# 或
npm run build && wrangler pages deploy .next
```

## 🔐 安全提示

1. **不要在 git 中提交實際的 secrets**
   - API keys、secrets 應透過 Cloudflare Dashboard 環境變數設定
   - `.env.local` 和 `.env.production.local` 應加到 `.gitignore`

2. **生產環境 SSL 驗證**
   - Worker 中的 `ssl: { rejectUnauthorized: false }` 僅用於開發/除錯
   - 上線時應改為 `true` 或使用適當的憑證驗證

3. **API 安全**
   - Worker 已實現基礎安全檢查（防止 DROP/TRUNCATE 等危險操作）
   - 建議額外添加身份驗證（API keys、JWT 等）

## 📚 相關資源

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Hyperdrive 文檔](https://developers.cloudflare.com/hyperdrive/)
- [Next.js 部署](https://nextjs.org/docs/deployment)

## 💡 建議的後續步驟

1. ✅ 確保本地開發正常運作
2. ✅ 部署 Worker API
3. ✅ 部署 Pages 前端
4. ⚠️ 設定自訂域名（可選）
5. ⚠️ 添加監控/告警（可選）
