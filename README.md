# Next + Postgres 提交表單範例 + Cloudflare Workers
# 目前此项目 Cloudflare Workers 部署仍处于失败状态，本地next正常部署，请自行
# `cp .env.example .env`创建`.env`文件配置数据库和验证 确保程式可以正确运行，自行反查DB，/admin还没完全完善好
簡單的 Next.js 專案，包含：

- 前端表單 (`/pages/index.js`)：`name`, `telephone`, `gender`, `other`。
- 後端 API (`/pages/api/submit.js`)：接收 POST，會自動建立 `submissions` 資料表（若不存在），並回傳新筆資料的 `id`。
- DB 連線檔案：`/lib/db.js`（使用 `DATABASE_URL` 環境變數）

## 🚀 新增：Cloudflare Workers + Hyperdrive 支援

現已支援在 Cloudflare Workers 環境中運行，使用 Hyperdrive 連接 PostgreSQL 數據庫。

### 兩種運行模式

1. **傳統 Next.js 模式**：本地 Node.js 伺服器
2. **Cloudflare Workers 模式**：無伺服器邊緣計算（新）

## 📋 快速上手

### 模式 1：Next.js 本地開發

1. 複製專案並進入資料夾：

```bash
cd /../next-postgres-form
```

2. 建立 `.env`（可先從 `.env.example` 複製）並設定資料庫連線字串：

```bash
cp .env.example .env
# 在 .env 裡填入例如：
# DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

3. 安裝相依套件並啟動開發伺服器：

```bash
npm install
npm run dev
```

4. 訪問 http://localhost:3000

### 模式 2：Cloudflare Workers + Hyperdrive (推薦用於生產)

詳細設置指南見：[CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)

快速步驟：

```bash
# 1. 安裝 Wrangler CLI
npm install -g wrangler

# 2. 登錄 Cloudflare
wrangler login

# 3. 在 Cloudflare 儀表板創建 Hyperdrive 數據庫連接

# 4. 在 wrangler.toml 中配置你的 Hyperdrive ID
# 編輯並替換 YOUR_HYPERDRIVE_ID

# 5. 本地開發測試
wrangler dev

# 6. 部署到 Cloudflare Workers
wrangler deploy
```

部署後訪問：`https://your-worker-name.your-account.workers.dev`

4. 開啟瀏覽器：`http://localhost:3000`，填寫表單並提交。

此版本變更：

- 新增 `email` 欄位（選填）。
- 電話改為「國家選擇 + 國際冠碼」與「僅數字輸入」欄位。
- `other` 欄位已改名為 `more`。

若看到 `error: database "..." does not exist`：程式會嘗試自動連到同一主機的 `postgres` 資料庫並建立指定的資料庫（需有建立資料庫的權限）。若自動建立失敗，請手動建立您的資料庫，或使用管理者權限的使用者更新 `DATABASE_URL`。

Admin 管理介面

- 網址：`/admin`。輸入 `admin` 作為使用者名稱即可登入（不需密碼）。
- 功能：列出 `public` schema 的資料表、檢視資料（即時輪詢）、刪除資料列、建立或刪除整個資料表。若資料庫帳號為只讀，介面會自動顯示 `ReadOnly: true`，並禁止刪除/建立等寫入操作。
- 匯出：在表格檢視頁支援匯出為 CSV 與 Markdown（Excel 也可由 CSV 開啟，若需 xlsx 將來可改為在前端用 `xlsx` 產生）。

Captcha (JS 驗證)

- 支援 `recaptcha`（Google reCAPTCHA）與 `turnstile`（Cloudflare Turnstile），可在 `.env` 設定要使用的提供者：
  - `NEXT_PUBLIC_2FA_PROVIDER=recaptcha` 或 `NEXT_PUBLIC_2FA_PROVIDER=turnstile`
- 前端會載入對應的 client-side JS（你需在 HTML/Next page head 或 `_document.js` 中載入相應 script，或在環境變數設定 `NEXT_PUBLIC_RECAPTCHA_SITEKEY` / `NEXT_PUBLIC_TURNSTILE_SITEKEY`）；前端會在提交時取得 token，並把 `captchaToken` 傳給後端。
- 後端會使用 `RECAPTCHA_SECRET` 或 `TURNSTILE_SECRET` 驗證 token。驗證失敗會拒絕提交。此方式符合你要求的「以 JS 驗證 Google/Cloudflare 的驗證流程」。

`.env` 範例（已更新 `.env.example`）：

```bash
# Provider: 'recaptcha' or 'turnstile'
NEXT_PUBLIC_2FA_PROVIDER=turnstile

# Google reCAPTCHA
# NEXT_PUBLIC_RECAPTCHA_SITEKEY=your_site_key_here
# RECAPTCHA_SECRET=your_secret_here

# Cloudflare Turnstile
# NEXT_PUBLIC_TURNSTILE_SITEKEY=your_site_key_here
# TURNSTILE_SECRET=your_secret_here
```

2FA 與提交行為變更

- 公開表單提交現在需要 TOTP（Google Authenticator / Cloudflare Authenticator）：請在專案根目錄 `.env` 設定 `TOTP_SECRET`（Base32 格式）。提交時會要求 `totp` 欄位驗證，驗證成功才能寫入資料庫。
- 提交 API 現在不會再回傳新資料的 `id`（依你要求）。
- 為了避免刪除資料導致 ID 跳號，系統會在新增時掃描現有 ID，找出最小的缺口 ID 並插入該 ID（如無缺口則使用最大 ID + 1）。此插入在交易與 `LOCK TABLE ... IN EXCLUSIVE MODE` 下進行以降低競爭問題。

資料表

伺服器會建立名為 `submissions` 的資料表（若尚未存在）：

```sql
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  name TEXT,
  telephone TEXT,
  gender TEXT,
  other TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

手動檢視資料

使用 `psql` 或任何 Postgres 管理工具，連上 `DATABASE_URL`，然後查詢：

```sql
SELECT * FROM submissions ORDER BY id DESC LIMIT 100;
```

安全性提醒

- 此範例目的是快速示範彼此整合流程，沒有加上 CSRF、驗證或細緻的輸入檢查。若要上線，請加入驗證、輸入消毒、HTTPS 與適當的權限控管。
