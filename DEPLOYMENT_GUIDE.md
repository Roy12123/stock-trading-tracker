# 股票交易收益記錄系統 - 雲端部署指南

本指南將教您如何將此應用程式部署到雲端，讓您可以透過手機或任何裝置存取。

---

## 方案一：Render 部署（推薦 - 免費且簡單）

### 優點
- ✅ 免費方案（有一些限制）
- ✅ 自動 HTTPS
- ✅ 自動部署（連結 GitHub 後自動更新）
- ✅ 提供免費的 PostgreSQL 資料庫
- ✅ 設定簡單

### 步驟

#### 1. 準備 Git 儲存庫

```bash
# 在專案目錄中初始化 git（如果還沒有的話）
cd /Users/roysmacbook/RICHRICH/Demo
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 上建立新儲存庫，然後推送
git remote add origin https://github.com/你的用戶名/你的儲存庫名稱.git
git branch -M main
git push -u origin main
```

#### 2. 註冊 Render 帳號

1. 前往 [https://render.com](https://render.com)
2. 使用 GitHub 帳號註冊/登入

#### 3. 建立 Web Service

1. 點擊 "New +" → "Web Service"
2. 連結您的 GitHub 儲存庫
3. 填寫以下設定：
   - **Name**: `stock-trading-tracker`（或任何您喜歡的名稱）
   - **Region**: 選擇離您最近的區域
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free`

#### 4. 新增環境變數

在 "Environment Variables" 區域新增：
- `SECRET_KEY`: 設定一個隨機字串（例如：`my-super-secret-key-12345`）
- `PYTHON_VERSION`: `3.11.0`

#### 5. 建立資料庫（可選，使用 SQLite）

免費版 Render 可以使用 SQLite，但資料會在每次部署時重置。

**如果需要持久化資料，可以升級到付費方案並使用 PostgreSQL：**
1. 點擊 "New +" → "PostgreSQL"
2. 選擇免費方案
3. 建立後，複製 "Internal Database URL"
4. 在 Web Service 的環境變數中新增：
   - `DATABASE_URL`: 貼上剛才複製的資料庫 URL

#### 6. 部署

1. 點擊 "Create Web Service"
2. 等待部署完成（約 2-5 分鐘）
3. 部署成功後，您會得到一個網址，例如：`https://stock-trading-tracker.onrender.com`

---

## 方案二：Railway 部署（簡單但付費）

### 優點
- ✅ 介面友善
- ✅ 自動 HTTPS
- ✅ 包含資料庫
- ⚠️ 免費額度有限（每月 $5 免費額度）

### 步驟

1. 前往 [https://railway.app](https://railway.app)
2. 使用 GitHub 登入
3. 點擊 "New Project" → "Deploy from GitHub repo"
4. 選擇您的儲存庫
5. Railway 會自動偵測 Flask 應用程式並部署
6. 在設定中新增環境變數 `SECRET_KEY`
7. 部署完成後獲得網址

---

## 方案三：Fly.io 部署（技術要求較高）

### 優點
- ✅ 免費方案足夠使用
- ✅ 全球 CDN
- ✅ 資料持久化
- ⚠️ 需要信用卡驗證

### 步驟

需要額外建立 `fly.toml` 和 `Dockerfile` 文件。詳細步驟請參考 Fly.io 官方文件。

---

## 方案四：PythonAnywhere（最簡單的傳統方案）

### 優點
- ✅ 完全免費方案
- ✅ 不需要信用卡
- ✅ 資料持久化
- ⚠️ 免費版有流量限制
- ⚠️ 網址較長

### 步驟

1. 前往 [https://www.pythonanywhere.com](https://www.pythonanywhere.com)
2. 註冊免費帳號
3. 開啟 "Bash" console
4. 克隆您的儲存庫：
   ```bash
   git clone https://github.com/你的用戶名/你的儲存庫名稱.git
   cd 你的儲存庫名稱
   pip install -r requirements.txt
   ```
5. 前往 "Web" 頁面
6. 點擊 "Add a new web app"
7. 選擇 "Manual configuration" 和 "Python 3.10"
8. 設定：
   - Source code: `/home/你的用戶名/你的儲存庫名稱`
   - Working directory: `/home/你的用戶名/你的儲存庫名稱`
   - WSGI configuration file: 編輯並設定指向 `app.py`
9. 重新載入網站

您的網址會是：`https://你的用戶名.pythonanywhere.com`

---

## 注意事項

### 安全性建議
1. **更改 SECRET_KEY**：在部署前務必設定一個強密碼作為 SECRET_KEY
2. **HTTPS**：確保使用 HTTPS（上述平台都自動提供）
3. **備份資料**：定期匯出資料做備份

### 免費版限制
- **Render 免費版**：閒置 15 分鐘後會休眠，下次存取需要等待 30 秒啟動
- **Railway**：每月 $5 免費額度用完後需付費
- **PythonAnywhere**：CPU 和流量有限制

---

## 推薦方案

**如果您是新手**：使用 **Render** 或 **PythonAnywhere**
- Render 比較現代化，但會休眠
- PythonAnywhere 更穩定，但介面較舊

**如果您需要商業用途**：建議使用付費方案或 Railway

---

## 使用方式

部署完成後：
1. 在瀏覽器輸入您的網址
2. 在手機上將網址加入書籤，即可隨時存取
3. 建議將網址加入手機主畫面（iOS Safari 或 Android Chrome 都支援「加入主畫面」功能）

---

## 需要協助？

如果遇到問題，請檢查：
1. 部署日誌（Logs）中的錯誤訊息
2. 確認所有環境變數都已正確設定
3. 確認 requirements.txt 中的套件版本相容
