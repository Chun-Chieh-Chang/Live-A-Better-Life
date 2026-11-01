# 專案交接文件 (handoff.md)

最後更新時間：2026-11-01  
最新提交基準：`6a3fc11` (`main`)

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

---

## 3. 測試與確效指令集

在執行修改或提交前，請執行以下確效檢查：

```powershell
# 1. 型別檢查
npm run lint

# 2. 單元與整合測試 (全 56 項測試)
npm test

# 3. Obsidian 瀏覽器端驗收測試
npm run test:obsidian-browser

# 4. 原生資料夾選擇視窗實測 (需要在已解鎖桌面互動環境執行)
npm run test:folder-dialog
```

> **注意 (測試環境)**：
> 若在沙盒環境下執行 `npm test`，部分需要本機 127.0.0.1 網路綁定的測試可能出現 `EACCES`，此時需在沙盒外（或正常終端）執行以取得完全綠燈。

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

若後續需進一步增強功能，建議方向如下：
1. **標籤與關鍵因素的筆記端雙向回寫**：若使用者希望在 Obsidian 中直接修改 `#狀態` 或 `[[關鍵因素]]` 並同步回 App，可於 `markdownExporter.ts` 擴充標籤解析器。
2. **週復盤提煉流程體驗**：目前手冊與日記已可雙向流動，可加強週日復盤時將日記有效策略一鍵提升至「我的小改變」之引導。
3. **雲端/離線切換穩定性監控**：持續觀察多裝置同步下的 revision conflict 機制在弱網環境的表現。
