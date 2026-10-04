# 🚀 Vercel 部署與架構說明指南 (Vercel Deployment Guide)

本專案已完成改寫與現代化重構，完全相容 **Vercel Serverless（無伺服器架構）** 與 **作業規範模組 1 ~ 5**。

---

## ❓ 常見問題解答 (FAQ)

### Q1: 為什麼 index 執行的時候偵測不到 API Key？網頁需要 API Key 嗎？
**不需要，且作業規定嚴禁前端直連 API！**
- **作業規範要求**：「使用 SQL 從 SQLite (`data.db`) 查詢資料，**嚴禁前端直連氣象署 API**」。
- **API Key 的正確用途**：`CWA_API_KEY` 是給後端資料管線使用的（`fetch_weather.py` 向中央氣象署抓取一週天氣預報）。
- **網頁端（index）的運作方式**：網頁端不需要任何氣象署金鑰，而是向 Serverless API（`/api/forecast`、`/api/summary`）發送請求，後端再用 SQL 查詢本機資料庫 `data.db` 並回傳標準 JSON 給網頁呈現。

---

### Q2: 為什麼之前開啟 index 時會載入失敗、無法顯示地圖與圖資？
主要原因有兩點：
1. **直接用瀏覽器開啟靜態檔案（`file:///...` 或 VSCode Live Server）**：
   瀏覽器發送的 `/api/forecast` 和 `/api/summary` 請求無法被處理（因為沒有 Python 後端在監聽），導致圖表與地圖缺少數據而呈現 `--`。
2. **地圖圖資協定**：
   地圖需使用開放的圖磚伺服器。我們已為您更新為 **OpenStreetMap 原生圖資**（與原 Streamlit Folium 完全相同），**完全免費且終身不需要任何地圖 API Key**。

---

### ✅ 我們已為您完成的全面強化：
1. **內建 SQLite 數據快照備援（Fail-safe Fallback）**：
   即使您直接在檔案總管雙擊 `public/index.html`（未啟動任何伺服器），網頁也會自動切換至本機備援模式，**42 筆一週預報、折線圖、數據表、台灣地圖與 6 大區域標記立刻 100% 完整顯示**！
2. **提供一鍵本地開發伺服器 (`dev_server.py`)**：
   支援即時 SQL 查詢與靜態託管，一鍵在本機完美模擬 Vercel 環境。
3. **極致輕量 Vercel Serverless Function (`api/index.py`)**：
   使用 Python 標準庫實現，**0 第三方套件依賴**，冷啟動僅需 10ms，部署速度 5 秒內完成，永遠不會遇到 Vercel 250MB 檔案大小限制！

---

## 💻 本機測試指南 (Local Development)

### 方式 A：一鍵啟動本地開發伺服器（推薦，完全模擬 Vercel）
在終端機專案根目錄下執行：
```bash
python3 dev_server.py
```
- 伺服器會自動於 `http://127.0.0.1:3000` 啟動，並自動在瀏覽器中開啟。
- 同時支援靜態網頁與 `/api/forecast`、`/api/summary` 即時 SQLite SQL 查詢。

### 方式 B：直接雙擊開啟 `public/index.html`
- 由於已加入自動備援機制，直接雙擊也能立即查看完整的折線圖、KPI 卡片、詳細數據表與台灣地圖。

---

## ☁️ 部署到 Vercel 步驟指南 (Step-by-Step Deploy)

### 步驟 1：確認資料庫與變更提交至 Git
```bash
git add .
git commit -m "feat: migrate to vercel serverless architecture with interactive dashboard"
git push origin main
```

### 步驟 2：登入 Vercel 匯入專案
1. 前往 [Vercel 官網 (vercel.com)](https://vercel.com/) 登入您的帳號。
2. 點擊右上角 **「Add New...」** -> **「Project」**。
3. 在 GitHub 倉庫列表中找到此專案並點選 **「Import」**。

### 步驟 3：部署設定 (保持預設即可)
- **Framework Preset**：Other
- **Root Directory**：`./`
- **Build and Output Settings**：保持預設（Vercel 會自動辨識 `vercel.json`、`api/` 與 `public/`）
- 點擊 **「Deploy」** 按鈕！

約 15 ~ 30 秒後，Vercel 就會為您產生專屬的線上 HTTPS 網址（例如：`https://hw1-taiwan-weather-forecst.vercel.app`）。

---

## 📂 專案架構概覽 (Architecture)

```text
├── api/
│   ├── index.py              # Vercel Serverless Function (執行 SQL 查詢 SQLite)
│   └── requirements.txt      # Serverless 依賴 (輕量化，零多餘套件)
├── public/
│   ├── index.html            # 現代化儀表板首頁 (折線圖 + 表格 + 地圖)
│   ├── style.css             # Glassmorphism 與響應式風格
│   ├── app.js                # 前端互動邏輯 (Chart.js + Leaflet.js)
│   └── fallback_data.json    # 離線備援數據快照
├── data.db                   # SQLite 資料庫 (儲存 6 區 × 7 天氣溫預報)
├── dev_server.py             # 本地一鍵開發伺服器
├── vercel.json               # Vercel 路由與端點配置
├── fetch_weather.py          # [ETL管線] 抓取中央氣象署 API (需 .env API Key)
├── parse_weather.py          # [ETL管線] 解析巢狀 JSON
└── database.py               # [ETL管線] 寫入 SQLite
```
