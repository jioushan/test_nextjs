# 快速部署清單（不破壞本地開發）

## ✅ 前置準備

- [ ] 本地 `npm run dev` 可以正常提交表單
- [ ] Hyperdrive 已在 Cloudflare Dashboard 配置
- [ ] GitHub 帳號（用於自動部署）

## 🚀 部署步驟（5 分鐘）

### 1️⃣ 部署 Worker API（2 分鐘）

```bash
cd ~/Desktop/next-postgres-form
wrangler deploy --env worker
```

**複製輸出的 Worker URL，格式如：**
```
https://next-postgres-form-api.your-account.workers.dev
```

### 2️⃣ 設定 Worker 環境變數（1 分鐘）

進入 Cloudflare Dashboard → Workers → next-postgres-form-api → Settings → Variables

添加（選擇適用的一組）：

**Turnstile：**
```
NEXT_PUBLIC_2FA_PROVIDER = turnstile
NEXT_PUBLIC_TURNSTILE_SITEKEY = your_key
TURNSTILE_SECRET = your_secret
```

**reCAPTCHA：**
```
NEXT_PUBLIC_2FA_PROVIDER = recaptcha
NEXT_PUBLIC_RECAPTCHA_SITEKEY = your_key
RECAPTCHA_SECRET = your_secret
```

**無 Captcha：** 不設定任何以上

### 3️⃣ 準備前端部署（1 分鐘）

```bash
# 創建生產環境變數
cat > .env.production.local << EOF
NEXT_PUBLIC_API_URL=https://next-postgres-form-api.your-account.workers.dev/api/submit
EOF

# 替換上面的 URL 為你複製的 Worker URL
```

### 4️⃣ 部署到 Pages（1 分鐘）

```bash
# 構建
npm run build

# 部署
wrangler pages deploy .next
```

## 📊 驗證部署

```bash
# 測試 Worker API
curl https://next-postgres-form-api.your-account.workers.dev/api/health

# 訪問前端
# https://next-postgres-form.pages.dev
```

## 📝 本地開發（不變）

```bash
npm run dev
# 訪問 http://localhost:3000
# 自動使用 /api/submit (Node.js API)
```

---

**成功標誌：**
- ✅ 本地 localhost:3000 表單提交正常
- ✅ Cloudflare Pages 頁面能訪問
- ✅ Pages 表單提交能成功（數據進入 PostgreSQL）

**若有問題：**
1. 檢查 Worker 日誌：`wrangler tail`
2. 檢查 Pages 構建日誌：Cloudflare Dashboard → Pages
3. 檢查前端 Network tab（確認 API URL 正確）
