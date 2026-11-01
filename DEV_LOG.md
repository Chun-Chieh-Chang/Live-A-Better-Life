# 開發日誌 (DEV_LOG.md)

本專案遵循 PDCA（計畫、執行、檢查、行動）與 MECE 原則，記錄每一次需求內容、遭遇問題、原因分析 (RCA) 以及矯正與預防措施 (CAPA)。

---

## 2026-11-01 - 實作「一鍵關閉背景運行的伺服器與相關依賴」

### 1. 需求背景 (Requirement)
- **使用者需求**：在 UI 中新增一個關閉伺服器的按鈕，可一鍵關閉背景運行的伺服器以及系統與相關依賴（選項 C：關閉 Node.js 伺服器、停止 Windows `LifeOS-Server` 排程任務、平穩關閉 Obsidian 視窗）。
- **UX/UI 規範**：
  - 專案面向無技術背景使用者，介面不露出底層技術術語（如 PID, Node, Express 等）。
  - 按鈕置於導航欄「更多」選單中，名稱為「關閉系統與背景服務」。
  - 具備防誤觸之二次確認彈窗（`ShutdownModal.tsx`），特別提示 Obsidian 本機 Markdown 已自動存檔。
  - 關閉完成後，前端切換為全螢幕友善提示卡片（「系統已安全關閉」），避免因連線中斷產生網路紅色報錯。
  - 按鈕可見性與後端權限嚴格對齊：僅在桌面個人模式（`desktop: true`）且具備已登入 Session 情況下渲染。

### 2. 根因與防禦分析 (RCA & Defense Analysis)
- **排程器自動復活問題**：
  - *問題分析*：Windows 工作排程器註冊了 `LifeOS-Server`，並具備失敗重試與登入啟動機制。若單純從 Node.js 退出進程（`process.exit()`），排程器可能誤判崩潰而嘗試重啟，且下次登入時仍會自動啟動。
  - *矯正措施 (CAPA)*：新增專用腳本 `deploy/windows/Stop-LifeOS.ps1`，主動停止 `LifeOS-Server` 排程任務，並清理 `server-process.json`。
- **資料落盤與優雅退出 (Graceful Shutdown)**：
  - *問題分析*：SQLite WAL 模式需確保連線正常關閉與寫入完成，否則可能殘留鎖定。
  - *矯正措施 (CAPA)*：在回應前端後，非同步執行腳本並依序執行 `personal.store.close()`、`httpServer.close()` 與 `process.exit(0)`。
- **外部依賴（Obsidian）平穩關閉與存檔機制**：
  - *問題分析*：Obsidian 基於 Electron，文字輸入是實時自動落盤（無手動存檔必要）。若強制 Kill 進程可能導致未 Flush 快取或 Workspace 佈局損毀。
  - *矯正措施 (CAPA)*：關閉腳本先發送視窗標準關閉訊息（`CloseMainWindow()`），給予 1.5 秒讓 Electron 完成正常落盤與退出，若仍殘留未關閉才進行安全清理。
- **PowerShell 語法相容防禦**：
  - *問題分析*：PowerShell 在解析 `catch { }` 時若為空區塊可能在 StrictMode 或不同版本引擎下觸發語法解析警告。
  - *矯正措施 (CAPA)*：在 `catch` 內使用 `$null = $_` 明確防禦，並由 `tests/windows-scripts.ps1` 進行嚴格 AST 確效通過。

### 3. 確效與測試結果 (Verification)
- `npm test`：57/57 測試全數通過（新增 desktop shutdown endpoint 授權與觸發測試）。
- `npm run test:windows-scripts`：PowerShell 語法與 ACL 驗證 100% 通過。
- `npm run lint` (`tsc --noEmit`)：零錯誤。
- `npm run build`：Vite 生產構建成功。

---

## 2026-11-01 - 實作「將互動式知識圖譜 / 流程圖無縫嵌入系統 UI」

### 1. 需求背景 (Requirement)
- **使用者需求**：將先前生成的互動式全景知識圖譜（`Live-A-Better-Life.html`）設法嵌入系統 UI 中。
- **架構與 UX 考量**：
  - 遵循專案規範：主要導航路徑（今天 / 我的小改變 / 生活回顧 / 備份）維持極簡；次要功能收納於「更多」選單中。
  - 採用無縫嵌入架構：將單檔案知識圖譜置於 `public/knowledge-graph.html`，以專用組件 `KnowledgeGraphTab.tsx` 透過自適應高度之 iframe 嵌入。
  - 避免 React 重繪與全域事件污染，同時在頂部工具列提供「重新整理」與「在新分頁獨立全螢幕開啟」按鈕。
  - 在「使用說明」（`ArchifyDiagramTab.tsx`）頂部亦提供一鍵跳轉「查看系統全景知識圖譜」，雙向暢通。

### 2. 確效與測試結果 (Verification)
- `npm run lint` (`tsc --noEmit`)：零錯誤。
- `npm test`：57/57 單元測試全數通過。
- `npm run test:windows-scripts`：PowerShell 確效通過。
- `npm run build`：Vite 打包成功，自動將 `public/knowledge-graph.html` 發佈至 `dist/knowledge-graph.html`。

---
