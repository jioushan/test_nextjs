# Cloudflare Pages + Workers 部署指南

本指南說明如何把 Next.js 應用部署到 Cloudflare Pages（前端靜態導出）+ Cloudflare Workers（API 後端 + Hyperdrive）。

## 🏗️ 架構

```
┌─────────────────────────────────┐
│  Cloudflare Pages (靜態前端)    │
│  - HTML / CSS / JS              │
│  - Next.js 靜態導出             │
└──────────────────┬──────────────┘
                   │
                   ├─ API 呼叫
                   ↓
┌─────────────────────────────────┐
│  Cloudflare Workers (API 後端)  │
│  - /api/submit 表單提交         │
│  - Hyperdrive 資料庫連接        │
└─────────────────────────────────┘
```

## 📋 前置需求

1. **Cloudflare 帳號** - https://dash.cloudflare.com
2. **GitHub 帳號** - 用於自動部署（可選）
3. **Hyperdrive 已設定** - 你的 PostgreSQL 連接 ID

## 🚀 部署步驟

### 步驟 1：本地測試靜態導出

```bash
# 1. 確保 next.config.js 中有 output: 'export'
cat next.config.js | grep "output:"

# 2. 本地構建測試
npm run build

# 若看到 "Export successful" 表示配置正確
```

### 步驟 2：部署 API Worker

```bash
# 1. 使用 Wrangler 部署 Worker
cd ~/Desktop/next-postgres-form

# 2. 部署（會自動使用 wrangler.toml 的配置）
wrangler deploy --env worker

# 3. 複製 Worker URL，例如：
# https://next-postgres-form-api.your-subdomain.workers.dev

# 4. 在 Cloudflare Dashboard > Workers 確認部署成功
```

### 步驟 3：設定環境變數（Cloudflare Dashboard）

進入 **Cloudflare Dashboard → Workers → 你的 Worker → Settings → Variables**

**添加以下環境變數：**

```
NEXT_PUBLIC_2FA_PROVIDER=turnstile
NEXT_PUBLIC_TURNSTILE_SITEKEY=your_site_key（若使用）
TURNSTILE_SECRET=your_secret（若使用）

# 或若使用 Google reCAPTCHA：
NEXT_PUBLIC_2FA_PROVIDER=recaptcha
NEXT_PUBLIC_RECAPTCHA_SITEKEY=your_site_key
RECAPTCHA_SECRET=your_secret
```

**Hyperdrive binding 已在 wrangler.toml 中配置，無需手動添加。**

### 步驟 4：更新前端 API 端點

編輯 `.env.production`（或 Cloudflare Pages 的環境變數設定）：

```bash
NEXT_PUBLIC_API_URL=https://next-postgres-form-api.your-subdomain.workers.dev/api/submit
```

其中 `your-subdomain` 是你的 Cloudflare 帳號子域名。

### 步驟 5：部署前端到 Cloudflare Pages

#### 方式 A：使用 Wrangler（推薦）

```bash
# 1. 本地構建
npm run build

# 2. 使用 Wrangler 部署到 Pages
wrangler pages deploy out/
```

#### 方式 B：使用 Git（GitHub）自動部署

1. 推送程式碼到 GitHub
2. 在 Cloudflare Dashboard 登錄並連接 GitHub 帳號
3. 選擇你的 GitHub repo
4. 設定構建命令：
   - Build command: `npm run build`
   - Build output directory: `out`
5. 添加環境變數（同步驟 3）
6. 部署！每次 push 都會自動部署

## ✅ 驗證部署

### 1. 檢查前端可用性

```bash
# 訪問 Cloudflare Pages 的 URL
# 例如：https://next-postgres-form.pages.dev
```

應該看到你的表單頁面。

### 2. 檢查 API 連接

```bash
# 測試 Worker health check
curl -i https://next-postgres-form-api.your-subdomain.workers.dev/api/health

# 應回傳：
# {"status":"healthy","timestamp":"2025-12-10T..."}
```

### 3. 測試完整流程

1. 在前端填寫表單
2. 點擊 Submit
3. 確認數據被插入到 PostgreSQL（檢查資料庫）

## 🔧 故障排查

### "CORS 錯誤" 或 "Failed to fetch"

**原因：** 前端無法呼叫 Worker API  
**解決：**
1. 確認 NEXT_PUBLIC_API_URL 正確設定
2. 確認 Worker 中的 CORS headers 已啟用
3. 檢查 Network tab，看實際 API 請求的 URL 是否正確

### "Database connection failed"

**原因：** Hyperdrive 無法連接資料庫  
**解決：**
1. 檢查 Hyperdrive ID 是否在 `wrangler.toml` 中正確
2. 在 Cloudflare Dashboard → Hyperdrive 確認連接狀態
3. 檢查資料庫防火牆是否允許 Cloudflare IP

### "404 Not Found"

**原因：** Worker 未正確部署或路由不對  
**解決：**
1. 確認 Worker 已部署：`wrangler list`
2. 確認路由正確（例如 `/api/submit` 而非 `/submit`）
3. 檢查 `src/worker.ts` 中的路由定義

## 📝 本地開發

```bash
# 在本地 3000 端口運行（使用本地 Node.js API）
npm run dev

# 訪問 http://localhost:3000
```

本地開發時自動使用 `pages/api/submit.js`，無需配置。

## 🔄 更新部署

### 更新前端

```bash
# 若使用 GitHub：直接 push
git push

# 若使用 Wrangler：
npm run build
wrangler pages deploy out/
```

### 更新 API Worker

```bash
# 修改代碼後
wrangler deploy --env worker
```

## 📚 相關資源

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Hyperdrive 文檔](https://developers.cloudflare.com/hyperdrive/)
- [Next.js 靜態導出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## 💡 進階配置

### 自訂域名

在 Cloudflare Dashboard → Pages → 你的專案 → Custom domains

### 環境變數管理

在 Cloudflare Pages 或 Workers Dashboard 的 Settings → Environment Variables

### 流量分析

Cloudflare Dashboard → Analytics 查看詳細統計

---

**如有問題，請檢查：**
1. ✅ Hyperdrive 連接是否正常
2. ✅ 環境變數是否完整
3. ✅ Worker 和 Pages 是否都已部署
4. ✅ API URL 是否正確
