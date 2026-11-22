# 虛擬中央氣象局

Node.js + Express + EJS + Supabase。前台資料全部由後台 `/admin` 管理。

## 啟動
1. Supabase → SQL Editor 執行 `supabase/schema.sql`（含範例資料）
2. `cp .env.example .env`，填入 `SUPABASE_URL`、`SUPABASE_SERVICE_KEY`（Settings → API 的 service_role）
3. `npm install && npm start` → http://localhost:3000 ，後台 http://localhost:3000/admin

## 後台
帳號密碼預設都是 `xiaohua`，在 `.env` 的 `ADMIN_USER` / `ADMIN_PASS` 修改。上線前請務必換掉。

## 結構
- `config/adminModules.js` 後台通用 CRUD 設定，新增模組只改這個檔案
- `routes/` public / admin / api　`views/` EJS 模板　`lib/safeQuery.js` 查詢失敗自動降級
