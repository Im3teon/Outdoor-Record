# 台灣登山紀錄簿

「台灣登山紀錄簿」是可部署到 GitHub Pages 的純靜態網站，用來記錄台灣古道、自然步道、百岳、小百岳、郊山的個人完成紀錄。

## 1) 專案用途與功能

- 顯示路線固定資料（`data/routes.json`）與分類進度統計。
- localStorage 儲存個人狀態與多筆造訪紀錄。
- 搜尋與篩選：文字、分類、地區、縣市、狀態。
- 路線詳情 modal：新增/編輯/刪除造訪紀錄。
- JSON 匯出/匯入（合併或覆蓋）與本機清除。

## 2) 本機預覽

### 方式 A：直接開啟

直接開啟 `index.html`。

### 方式 B：靜態伺服器（建議）

```bash
python -m http.server 8000
```

開啟 `http://localhost:8000`。

## 3) GitHub Pages 部署

專案已提供 `/home/runner/work/Outdoor-Record/Outdoor-Record/.github/workflows/deploy-pages.yml`。

1. push 到 `main`。
2. GitHub → **Settings → Pages**。
3. Build and deployment 選 **GitHub Actions**。
4. `Deploy GitHub Pages` workflow 會自動部署。

## 4) 資料結構與 routes.json 維護

`data/routes.json` 為固定路線資料；個人紀錄儲存在 localStorage。

每筆路線欄位：

- `id`（唯一且固定）
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
- `lastVerified`

### 擴充策略（依你指定順序）

1. **已完成**：百岳 100 + 小百岳 100 名錄先收錄。
2. **進行中**：古道/自然步道/郊山依地區（北→中→南→東→離島）逐區補齊。
   - 已完成：北部批次（本次新增）。
   - 下一區：中部。
3. **下一步**：依官方來源（國家公園署、林業署步道）逐筆核對與補齊欄位。

> 現階段部分路線欄位（距離、爬升、時間、是否需申請）仍保留待補，避免未核對即填入高精度資料。

## 5) localStorage 限制

- 僅存在同一瀏覽器與裝置。
- 清除瀏覽器資料或換裝置後可能遺失。
- 請定期匯出 JSON 備份。

## 6) 匯入/匯出紀錄

- 匯出：下載 `taiwan-hiking-log-backup-YYYY-MM-DD.json`。
- 匯入：可選「合併」或「覆蓋」，匯入前會二次確認。
- 格式錯誤時會顯示錯誤訊息，且不覆寫既有資料。

## 7) 初始資料聲明

資料庫仍在持續擴充。雖已納入百岳與小百岳名錄，但古道、自然步道、郊山尚未宣稱全台完整，需逐批核對更新。

## 8) 公開網站資料安全建議

請勿公開敏感資訊，例如：

- 精確住址
- 即時位置
- 未經同意的同行者個資
- 其他可識別個人隱私內容

## 專案結構

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
