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

---

## 2026-11-01 - 幾何運算優化：分項流程 (Active整體) 避障與允許空間精確居中

### 1. 缺陷根本原因 (RCA)
- **包圍盒計算盲點**：點選分類（如「系統總覽」）時，原演算法僅計算了 root 節點本身的 Bounding Box，遺漏了其相連的高亮下游節點（阿德勒心理學、安全工作區）與連接線，導致延伸至右側的元素被推至視窗邊界。
- **允許空間盲點**：相機置中公式未預先扣除右側 400px 的抽屜面板寬度，抽屜滑出後直接遮蔽了畫面右半邊的 active 節點。

### 2. 矯正與預防措施 (CAPA)
- **全要素 Active 拓撲包圍盒 (`getActiveBounds`)**：
  - 自動偵測所有處於 active 狀態的節點（包含目標分類所有節點 + 與其直接相連的高亮下游節點），動態計算最小外接矩形。
- **允許空間幾何居中演算法 (`fitCameraToActive`)**：
  - 明確定義右側 400px 抽屜為不可用遮蔽區，安全邊距為各 40px。
  - 計算出「允許安全視野寬度」`availW = clientWidth - 400 - 80`，並將鏡頭中心錨定在 `safeCenterX = 40 + availW / 2`。
  - 動態計算 `targetScale`，保證所有 active 模組和箭頭線條 100% 完整容納於允許空間中，杜絕遮擋。

### 3. 確效與測試結果 (Verification)
- `npm run lint` (`tsc --noEmit`)：零錯誤。
- `npm test`：57/57 單元測試全數通過。
- `npm run build`：Vite 打包成功。

---


## 2026-11-01 - 疑難排解：背景服務未重啟導致新端點回傳 404 (Not Found)

### 1. 問題現象 (Symptom)
瀏覽器 DevTools Console 出現以下紅色報錯：
```text
:3002/api/obsidian/changes:1  Failed to load resource: the server responded with a status of 404 (Not Found)
:3002/api/system/shutdown:1  Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 2. 根因分析 (RCA - Root Cause Analysis)
1. **進程與代碼版本脫鉤**：
   - 透過檢查 `Live-A-Better-Life-Data/server-process.json` 與日誌時間戳，確認本機背景 Node.js 伺服器進程（PID 19848，監聽埠號 3002）是在今日 **15:19** 啟動並常駐於記憶體中。
   - 新端點 `/api/obsidian/changes` 是在 **15:47**（commit `44f88d9`）提交進代碼庫；
   - 關閉伺服器端點 `/api/system/shutdown` 則是在 **19:58**（commit `6448a3b`）提交進代碼庫。
2. **Express 路由靜態綁定特性**：
   - Node.js / Express 於進程啟動時將路由寫入記憶體中；常駐於背景的伺服器進程並不會隨 git commit 或前端代碼更新而自動重載後端路由。
   - 前端頁面（經瀏覽器重新載入或熱重載）嘗試呼叫新端點時，背景的舊伺服器進程找不到該路由，因而退回 `app.use('/api', ...)` 的 404 處理器，回傳 HTTP 404 Not Found。
3. **關閉請求連鎖失效**：
   - 由於 `/api/system/shutdown` 回傳 404，關閉伺服器的指令未被舊進程接收與執行，導致使用者多次點擊確認關閉時重複出現 404 報錯。

### 3. 矯正與預防措施 (CAPA)
1. **矯正措施 (Corrective Action)**：
   - 目前背景舊伺服器進程已停止。
   - 使用者只需重新執行根目錄的 `Start-LifeOS.cmd`（或執行 `powershell -File deploy/windows/Start-LifeOS.ps1 -ConfigPath Live-A-Better-Life-Data\config.json -OpenBrowser`），即可使用載入最新代碼的伺服器。
2. **預防措施 (Preventive Action)**：
   - 當代碼庫新增或修改後端 API 路由（`server/*.ts`）時，在文檔與回報中提醒：「後端路由變更需重新啟動伺服器服務方能生效」。

---


## 2026-11-01 - 導航與介面架構優化：關閉按鈕提升至最上層與完全移除「放鬆一下」

### 1. 需求背景 (Requirement)
- **使用者需求**：
  1. 「關閉系統與背景服務」按鈕應直接在主頁的最上層（頂部導航列）出現，不應隱藏在「更多」選單中。
  2. 「放鬆一下」是多餘且無必要的頁面，應完全移除。
- **UX/UI 規範**：
  - 維持 44x44px 最小觸控目標與無障礙標準，按鈕設置於桌面個人模式頂部右側，清晰可見，並具備防誤觸二次確認彈窗。
  - 在小螢幕（如 375px/390px）自適應隱藏非核心的「已記錄 X 天」文字標籤，確保絕無水平溢出 (Zero Horizontal Overflow)。
  - 徹底貫徹 MECE 與 YAGNI 原則：移除死碼組件 `ZenSanctuary3D.tsx` 與相關型別定義，釋放近 500 KB 構建體積。

### 2. 實施步驟與架構調整 (Execution & Architecture)
1. **頂部導航重構 (`Navbar.tsx`)**：
   - 將「關閉系統與背景服務」按鈕提升至 Header 最頂層右側，當 `isDesktop && onOpenShutdown` 時常駐渲染，具備紅色品牌警告色調（`text-red-700 bg-red-50 hover:bg-red-100 border-red-200/80`）與 `Power` 圖示。
   - 自「更多」二級選單中移除「放鬆一下」與「關閉系統與背景服務」，選單重構為三欄對稱網格（`使用說明`、`系統全景圖`、`使用狀態`）。
2. **死碼與依賴徹底清理 (MECE)**：
   - 刪除 `src/components/ZenSanctuary3D.tsx`。
   - `src/types.ts`：自 `ActiveTab` 聯合型別中移除 `"zen3d"`。
   - `src/App.tsx`：移除 `ZenSanctuary3D` 之 import 與條件渲染區塊。
   - `src/utils/architecture.ts`：移除 `ui_3d` 節點與 `e8` 連接線。
   - `Live-A-Better-Life.html` 與 `public/knowledge-graph.html`：移除 `ent_zen3d` 實體與所有雙向拓撲依賴。

### 3. 確效與測試結果 (Verification)
- `npm run lint` (`tsc --noEmit`)：零錯誤，型別完全乾淨。
- `npm test`：57/57 單元測試 100% 通過。
- `npm run test:windows-scripts`：PowerShell 腳本與 ACL 驗證 100% 通過。
- `npm run build`：Vite 生產構建成功，JS 體積顯著縮減。

---
