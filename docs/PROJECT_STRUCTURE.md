# 專案目錄與清理紀錄

本文件負責目錄分類與檔案處置，產品需求只在 PRODUCT_REQUIREMENTS.md 維護。根目錄不保留舊版日記架構、歷史逐字稿、重複手冊或測試輸出。

## 各目錄的唯一責任

| 位置 | 用途 | 保留理由 |
| --- | --- | --- |
| src/ | 使用者介面、共用型別及領域規則 | 正式前端原始碼 |
| server/、server.ts | 後端資料、登入、AI、筆記輸出 | 執行中的服務 |
| scripts/ | 檢查、帳號與備份工具 | 目前支援的操作入口 |
| deploy/windows/ | Windows 安裝、啟用與排程 | Windows 啟用唯一入口由 Activate.ps1 統一 |
| tests/ | 控制測試與 tests/fixtures 示範資料 | 範例僅供測試，不當成使用者資料 |
| docs/ | 分工明確的目前需求、規範與操作說明 | README 是唯一文件入口，各主題不維護第二份內容 |
| dist/ | 最新正式建置 | 本機正式服務啟動所需，可重建、Git 忽略 |
| node_modules/ | 目前專案依賴 | 程式及離線運行所需，可重新安裝、Git 忽略 |
| Live-A-Better-Life-Data/ | 私人記錄、設定、備份、輸出與參考資料 | 保留私人 ACL，Git 忽略，禁止 HTTP 存取 |
| Live-A-Better-Life-Tools/ | 本機工具及安裝快取 | 可修復安裝，Git 忽略，禁止 HTTP 存取 |

根目錄其餘檔案都是現行入口或設定：Start-LifeOS.cmd、README.md、AGENTS.md、package.json、bun.lock、index.html、server.ts、TypeScript/Vite/Git 設定，以及 Git 忽略的私人 .env。不把 .env 或兩個本機目錄提交或推送。

## 權威來源及可重建副本

- 個人模式的實際記錄以 owner.sqlite 為準；筆記以 config.json 的 NotesRoot 指向輸出。Notes 是輸出，不是第二個獨立資料庫。
- 瀏覽器模式仍以該瀏覽器已保存內容為準，不自動合併個人模式或範例。
- 套件清單以 package.json 為準，精確版本由 bun.lock 鎖定；自檢不再維護另一份手寫套件清單。
- 策略評估規則在 src/utils/evolution.ts；筆記產生在 server/obsidian.ts 與共用匯出函式；不另建立模板庫或種子手冊。

## 2026-11-01 清理處置

| 原位置或內容 | 處置與原因 |
| --- | --- |
| 根目錄 01_日誌、02_模版、03_知識庫 | 已移除。日誌為空，三份文字檔均與舊產生器範例完全相同；未發現自訂修改。核心反省、微小策略及教練原則已整合至 PRODUCT_REQUIREMENTS.md，範例不匯入個人記錄。 |
| scripts/bootstrap.ts 的模板與建庫邏輯 | 已移除。只檢查現行程式依賴與可選 AI 設定，不建立第二套筆記。新增測試防止重建舊目錄或修改現有筆記。 |
| src/data/initialData.ts | 測試需要的範例移到 tests/fixtures/lifeData.ts；重複的逐字稿、舊藍圖及 README 副本移除。 |
| TranscriptBlueprintTab、transcript 路由 | 已移除。沒有一般導覽入口，且夾帶過時的架設指令；原始文稿另行保留。 |
| 根目錄兩份原始 .txt | 完整搬至私人 Reference/Originals，SHA-256 比對一致；保留需求追溯，不作現行執行指令，不發布。 |
| 舊可靠性計畫、閉環實施計畫 | 完整搬至私人 Reference/History；歷史驗證證據不刪，現行程序整合至 TESTING.md，演化規則由 CLOSED_LOOP.md 維護。 |
| 舊 HTML Windows 安裝手冊 | 已移除。現行安裝、備份與疑難排解統一到 WINDOWS_LOCAL.md。 |
| wiki/MEMORY.md | 必須完成的回寫要求已整合至產品需求與 Obsidian 規格，AGENTS.md 直接指向正式文件。 |
| artifacts/、.aistudio/、未使用的 public 圖片與 metadata.json | 已移除舊截圖、暫存及未使用的平台範本。新測試截圖統一寫到私人 Acceptance/browser，覆寫同一組檔名。 |
| 根目錄 server.*.log | 搬入私人 Logs 並重新啟動開發服務；後續日誌不再寫回根目錄。 |
| canvas-confetti 及其型別套件 | 正式介面已無使用，已從 package.json 及 bun.lock 移除。 |

Reference/manifest.json 記錄四份保留文件的原始路徑、新位置及雜湊；Reference/說明.md 解釋讀取方式。保留的是原始來源與歷史證據，不維護第二份產品規格。

## 驗收結果

待本次最終檢查後補入實測結果。Obsidian 雙向回寫與原生選擇視窗前景驗收仍保留在產品未完成項目，清理不代表這兩項功能已完成。
