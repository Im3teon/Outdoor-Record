# 台灣登山紀錄簿

「台灣登山紀錄簿」是一個可部署到 GitHub Pages 的純靜態個人網站，用來記錄你在台灣的古道、自然步道、百岳、小百岳與郊山完成狀態。

## 1) 專案用途與功能

- 以卡片瀏覽路線固定資料（`data/routes.json`）。
- 以 localStorage 儲存個人紀錄（狀態、造訪日期、心得、照片連結）。
- 顯示總進度與各分類進度（百岳／小百岳／古道／自然步道／郊山）。
- 支援文字搜尋與多條件篩選（分類、地區、縣市、狀態）。
- 支援 JSON 匯出／匯入（合併或覆蓋）與本機紀錄清除。
- 路線詳情 modal 可新增、編輯、刪除多筆造訪紀錄。

## 2) 如何在本機預覽

### 方式 A：直接開啟

直接用瀏覽器開啟專案根目錄的 `index.html`。

### 方式 B：簡單靜態伺服器（建議）

如果你偏好透過本機網址預覽，可使用任何簡單靜態伺服器，例如：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000`。

## 3) 如何部署 GitHub Pages

本專案已提供 `.github/workflows/deploy-pages.yml`。

1. 將程式碼推到 `main` 分支。
2. 到 GitHub repository 的 **Settings → Pages**。
3. Build and deployment 選擇 **GitHub Actions**。
4. `Deploy GitHub Pages` workflow 會自動部署。

> 若你改用 branch 發布，也可不使用 workflow；但目前預設是標準 Pages Actions 流程。

## 4) 資料結構與如何新增／修改 `data/routes.json`

`data/routes.json` 是「固定路線資料」，`localStorage` 是「個人完成紀錄」，兩者分離。

每筆路線至少包含：

- `id`：固定唯一鍵（不可重複，會對應到 localStorage）。
- `name`
- `regions`（可多個）
- `counties`（可多個）
- `categories`（可多個）
- `mountains`（可多個）
- `difficulty`
- `distanceKm`
- `elevationGainM`
- `estimatedHours`
- `permitRequired`
- `sourceUrl`
- `notes`
- `lastVerified`（資料最後確認日期）

新增路線時建議流程：

1. 複製既有物件格式。
2. 設定新的唯一 `id`（建議英數與 `-`，例如 `nantou-example-route`）。
3. 補上可確認欄位，暫時不確定可保留待補（但欄位名稱要保留）。
4. 更新 `lastVerified`。
5. 重新整理網站確認顯示正常。

## 5) localStorage 限制

- 個人紀錄只存在「同一瀏覽器 + 同一裝置」。
- 換瀏覽器、換裝置或清除瀏覽器資料後，紀錄可能消失。
- 請定期使用匯出功能備份。

## 6) 如何匯入／匯出紀錄

- **匯出**：按「匯出我的紀錄」，會下載例如 `taiwan-hiking-log-backup-2026-09-14.json`。
- **匯入**：選擇 JSON 檔後，選擇模式：
  - 合併：保留現有資料並合併匯入內容。
  - 覆蓋：以匯入內容取代目前紀錄。
- 匯入前會顯示確認提示，格式錯誤時會顯示明確錯誤訊息且不破壞既有資料。

## 7) 初始資料聲明

`data/routes.json` 目前為**初始示範資料**，用於展示資料模型與功能，尚未完整收錄全台所有路線。後續需逐步依可靠官方來源擴充並核對。

## 8) 公開網站資料安全建議

公開網站請避免放入敏感個資，特別是：

- 精確住址
- 即時位置
- 未經同意的同行者資訊
- 其他可識別個人隱私的內容

---

## 專案檔案結構

```text
/
├── index.html
├── styles.css
├── app.js
├── README.md
├── data/
│   ├── routes.json
│   └── sources.json
└── .github/
    └── workflows/
        └── deploy-pages.yml
```
