# 專案交接文件 (handoff.md)

最後更新時間：2026-11-01  
最新工作基準：已完成死碼依賴清理、圖譜無縫嵌入、關閉系統按鈕頂層重構與啟用流程確效 (`main`)

---

## 1. 專案現況與核心架構概覽

本專案為 **把日子過好 (Live-A-Better-Life)**，旨在提供無技術背景使用者極簡、高可靠的生活反省與個人操作系統 (Personal OS)，並整合 Windows 本機資料庫與 Obsidian 雙向同步。

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS。
- **後端**：Node.js / Express，支援本機 SQLite (`better-sqlite3`) 儲存個人工作區與自動備份。
- **單一事實來源 (SSOT)**：
  - 核心型別與資料規格：`src/types.ts`、`src/utils/validation.ts`。
  - 日記與手冊欄位定義與 Markdown 雙向解析：`src/utils/markdownExporter.ts`。
  - 個人模式權威資料庫：`Live-A-Better-Life-Data/owner.sqlite`。
  - Obsidian 輸出目錄：由 `config.json` 的 `NotesRoot` 指定。
  - 開發日誌 SSOT：根目錄唯一維護 `DEV_LOG.md`。
- **環境與隱私防護**：
  - `Live-A-Better-Life-Data/` 與 `Live-A-Better-Life-Tools/` 嚴格維持 Git-ignored，禁止透過 HTTP 暴露。
  - 根目錄 `.env` 永不納入版控。

---

## 2. 最近完成的核心里程碑 (2026-11-01)

1. **專案架構精簡與死碼清理 (SSOT / MECE)** (`ee27c99`)：
   - 移除了根目錄舊筆記架構 (`01_日誌`、`02_模版`、`03_知識庫`) 及過時的測試/規劃檔案。
   - 整合 `PRODUCT_REQUIREMENTS.md`、`PROJECT_STRUCTURE.md` 與 `DEV_LOG.md`。
   - 歷史逐字稿與原件已移至私人 `Reference/`（受 SHA-256 清單追溯）。

2. **Obsidian 雙向回寫 — 日記篇** (`44f88d9`)：
   - 支援解析 Obsidian 日記筆記 (`01_日記/YYYY-MM-DD.md`)。
   - 透過 `.life-os-sync.json` 快照進行三方對比（筆記 vs 基準快照 vs App 內資料）。
   - 支援衝突檢測（兩端皆修改同一欄位時強制使用者選擇保留版本）。
   - 保留未帶回修改不被後續儲存覆蓋；捨棄時移至「保留的修改/」資料夾。

3. **原生資料夾選擇視窗前景驗證** (`d8ae79c`)：
   - 新增 `tests/folder-dialog-foreground.ps1` (`npm run test:folder-dialog`)。
   - 透過 Win32 API 實證自背景呼叫時資料夾視窗可見、可取消、可選擇且確實置於前景（已於解鎖桌面驗證）。

4. **Obsidian 雙向回寫 — 「我的小改變」手冊篇** (`6a3fc11`)：
   - 支援 `我的小改變.md` 項目編輯、勾選狀態切換、新增（無 ID 標記之行）與刪除項目。
   - 採用隱藏註解標記 `<!-- id:... -->` 維持與 App 端項目的唯一識別。
   - 消除空白、換行與「尚未新增」預設文字的假衝突，防止產生冗餘備份。

5. **個人空間同步面板介面統整（方案 A 實施）**：
   - 解決個人空間同步大卡片霸佔每個頁面頂部的 UX 問題。
   - 非備份頁面（今天、我的小改變、生活回顧）縮減為極簡單行微型狀態條（約 36px），消除視覺干擾。
   - 完整管理面板（路徑變更、手動同步、衝突仲裁、版本還原、登出）收斂至「備份」頁面一站式管理。

6. **GitHub Pages 自動化確效部署**：
   - 設定 `vite.config.ts` 使用相對基底路徑 (`base: './'`)，預防 404 資源載入失敗。
   - 建立 `.github/workflows/deploy.yml` 自動化工作流（CI 必須通過 `lint`、`test` 與 `build` 確效才進行 Pages 部署）。
   - 線上站點：[https://chun-chieh-chang.github.io/Live-A-Better-Life/](https://chun-chieh-chang.github.io/Live-A-Better-Life/)。

7. **純靜態託管 404 優雅降級 (`6119de0`)**：
   - `PersonalWorkspace.tsx` 在偵測到 `/api/auth/session` 回傳 404 時（純靜態代管如 GitHub Pages），自動切換至「純瀏覽器本地模式 (`mode: 'local'`)」，徹底杜絕畫面死鎖在「正在確認服務狀態…」。
   - 新增手動「使用純瀏覽器模式」備援按鈕，提升離線環境魯棒性。

8. **實作「一鍵安全關閉系統與背景服務」** (`6448a3b`, `f785c4b`, `aeb2f56`)：
   - 點擊「關閉系統與背景服務」後，後端透過 `deploy/windows/Stop-LifeOS.ps1` 停止 `LifeOS-Server` 排程、通知關閉 Obsidian 視窗釋放資源、關閉 SQLite WAL 連線與 HTTP 伺服器。
   - 頂部導航重構：關閉按鈕提升至 Header 最上層右側，個人桌面模式常駐可見，具備二次確認彈窗與友善安全關閉狀態提示。

9. **三維空間 (zen3d) 徹底移除與依賴精簡** (`0c4768d`)：
   - 移除「放鬆一下」與 `ZenSanctuary3D.tsx` 組件。
   - 自 `package.json` 與 `bun.lock` 徹底移除 `three` 與 `@types/three` 依賴，大幅減少構建負擔。

10. **個人模式知識圖譜無縫嵌入** (`8a4e3fa`, `cf1a774`)：
    - 將全景知識圖譜置於 `public/knowledge-graph.html`，以專用 `KnowledgeGraphTab.tsx` 透過自適應高度 iframe 嵌入系統 UI，並支援「在新分頁獨立全螢幕開啟」。

11. **知識圖譜 JSON 語法迴歸修復與 RSI 自回歸進化防禦** (`5d3c642`)：
    - 修復 HTML 內嵌資料節點，並在 `tests/evolution.test.ts` 中新增物理剛性測試，確保所有內嵌 JSON 與節點連接拓撲 100% 合法。

12. **Windows 部署流程與 Bun Lockfile 對齊確效**：
    - 更新 `bun.lock` 對齊 `esbuild` 0.28.2，修復 `--frozen-lockfile` 阻斷問題；Windows `Activate.ps1` 6 階段完整通過。

---

## 3. 測試與確效指令集

在執行修改或提交前，請執行以下確效檢查：

```powershell
# 1. 型別檢查
npm run lint

# 2. 單元與整合測試 (全 58 項測試)
npm test

# 3. Windows PowerShell 腳本與 ACL 確效
npm run test:windows-scripts

# 4. Obsidian 瀏覽器端驗收測試
npm run test:obsidian-browser

# 5. 原生資料夾選擇視窗實測 (需要在已解鎖桌面互動環境執行)
npm run test:folder-dialog
```

---

## 4. 刻意保留之設計邊界與未納入回寫項目

根據 `docs/OBSIDIAN_SYNC_PLAN.md` 與第一性原理，以下內容**刻意不納入自動雙向回寫**，重寫時保留為副本：
- **固定格式標題與段落**：系統格式由程式產生，不作為使用者資料輸入。
- **AI 建議區塊 (`> [!tip] 🤖 AI 認知副處理器建議`)**：為演算法生成內容，不接受筆記端逆向覆寫。
- **標籤與關鍵因素**：目前為系統衍生標註。
- **在 Obsidian 中自由新增但非 `YYYY-MM-DD.md` 格式之日記**：無 ID 或時間錨點，無法直接對齊資料模型。
- **項目重新排序**：以 App 內部排序為準，不依筆記行列順序更動 App 資料結構。

---

## 5. 接續工作與待辦建議 (Next Steps)

1. **版本發布與推送**：在經過本地 58 項單元測試、型別檢查與 Windows 腳本驗收後，依規範向使用者提出推送申請。
2. **生產環境監控**：關注 GitHub Pages 線上發布後的狀態回報。
