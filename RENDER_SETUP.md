# Render 部署設定指南

## 當前問題
您的應用程式已部署到 https://stock-trading-tracker.onrender.com/，但資料庫缺少 `is_personal` 欄位。

## 解決方案

### 步驟 1：更新環境變數

1. 前往 Render Dashboard：https://dashboard.render.com/
2. 選擇您的 `stock-trading-tracker` 服務
3. 點擊左側選單的 "Environment"
4. 新增以下環境變數（如果還沒有）：

   ```
   APP_PASSWORD = B122917588
   ```

5. 點擊 "Save Changes"

### 步驟 2：手動重新部署

由於程式碼已經更新（包含自動資料庫初始化），您需要手動觸發重新部署：

**選項 A：在 Render Dashboard 中**
1. 在您的服務頁面
2. 點擊右上角的 "Manual Deploy" 按鈕
3. 選擇 "Clear build cache & deploy"
4. 等待部署完成（約 2-5 分鐘）

**選項 B：自動部署（已經設定）**
- Render 會自動偵測 GitHub 的更新並重新部署
- 等待幾分鐘，Render 應該會自動開始部署

### 步驟 3：如果使用 PostgreSQL 資料庫

如果您在 Render 上有設定 PostgreSQL 資料庫：

1. 在 Render Dashboard 中找到您的 PostgreSQL 資料庫
2. 點擊進入資料庫詳細頁面
3. 點擊 "Access" 標籤
4. 複製 "Internal Database URL"
5. 回到您的 Web Service
6. 在 "Environment" 中確認有 `DATABASE_URL` 環境變數
7. 如果沒有，新增：
   ```
   DATABASE_URL = [貼上剛才複製的 Internal Database URL]
   ```

### 步驟 4：驗證部署

1. 等待部署完成
2. 前往 https://stock-trading-tracker.onrender.com/
3. 使用密碼 `B122917588` 登入
4. 嘗試新增一筆交易並勾選「個人操作」
5. 檢查兩個圖表是否都正常顯示

## 程式碼更新說明

最新的程式碼已經包含以下修正：

1. **自動資料庫初始化**：應用啟動時會自動執行 `db.create_all()`
2. **is_personal 欄位**：資料庫模型已包含此欄位
3. **環境變數支援**：支援 `APP_PASSWORD` 環境變數設定密碼

## 注意事項

### 免費版 Render 的限制

- **SQLite 不持久化**：如果使用預設的 SQLite，資料會在每次部署時重置
- **閒置休眠**：15 分鐘無活動後會休眠，下次訪問需要等待 30-60 秒喚醒

### 建議使用 PostgreSQL

為了資料持久化，建議升級使用 Render 的免費 PostgreSQL：

1. 在 Render Dashboard 點擊 "New +" → "PostgreSQL"
2. 選擇免費方案
3. 建立後複製 "Internal Database URL"
4. 在 Web Service 中設定 `DATABASE_URL` 環境變數

## 常見問題

**Q: 部署後還是出現相同錯誤？**
A: 確認已經點擊 "Clear build cache & deploy" 清除快取後重新部署

**Q: 忘記密碼怎麼辦？**
A: 密碼是 `B122917588`，存儲在 `APP_PASSWORD` 環境變數中

**Q: 可以更改密碼嗎？**
A: 可以，在 Render 的 Environment 中修改 `APP_PASSWORD` 的值即可

## 支援

如有任何問題，請檢查 Render 的部署日誌：
1. 進入您的服務頁面
2. 點擊 "Logs" 標籤
3. 查看是否有錯誤訊息
