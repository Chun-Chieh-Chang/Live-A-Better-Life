# 開發日誌 (DEV_LOG.md)

本專案遵循 PDCA（計畫、執行、檢查、行動）與 MECE 原則，記錄每一次需求內容、遭遇問題、原因分析 (RCA) 以及矯正與預防措施 (CAPA)。

---

## 2026-11-01 專案整理（SSOT / MECE）

需求：專案資料夾保持最新；過時內容移除；不宜移除的內容整合並說明。

### 結果
- 目錄責任與移除清單見 [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)，此處不重複。
- 暫時性規劃檔（task_plan.md、progress.md、findings.md）已整合進本日誌並自根目錄移除。

### 發現與原因（RCA）
| 問題 | 原因 | 矯正 / 預防（CAPA） |
| --- | --- | --- |
| `scripts/bootstrap.ts` 在專案根目錄產生第二套舊筆記結構 | 早期範本遺留，與私人資料庫、Obsidian 匯出重疊 | 移除建庫邏輯，只保留檢查；新增 `tests/bootstrap.test.ts` 防止復發 |
| 範例資料只被測試使用卻放在 `src/data` | 資料位置與使用者不一致 | 移到 `tests/fixtures/lifeData.ts` |
| 歷史逐字稿頁面無導覽入口且夾帶過時指令 | 舊功能未清除 | 移除頁面與路由；原件改存私人 Reference 並以 SHA-256 清單追溯 |
| 根目錄堆積規劃檔、開發紀錄 | 工作過程產物未歸位 | 規劃檔併入本日誌；紀錄移到私人 Logs；根目錄僅允許 PROJECT_STRUCTURE.md 所列入口檔 |

### 失敗嘗試
- 一次批次遞迴刪除被拒絕；改為逐一以明確路徑刪除檔案與空資料夾，全數成功。

### 狀態
- 整理完畢，符合 MECE 與 SSOT 原則。

---

## 2026-11-01 Obsidian 修改帶回與資料夾視窗實測

需求：把在 Obsidian 的修改帶回工具；實測資料夾選擇視窗在前景顯示。

### 做法
- 日記的可編輯欄位定義只在 `markdownExporter.ts` 一處，匯出與讀回共用（SSOT）。
- 每次匯出在同步清單記錄各欄位原始內容，用「筆記 / 原始 / 工具」三方比較；只有雙方不同才算衝突，衝突必須明確選擇。
- 尚未帶回的筆記修改不會被後續儲存覆蓋。

### 問題與原因（RCA）
| 問題 | 原因 | 矯正 / 預防 |
| --- | --- | --- |
| 衝突測試先得到 200 而非 409 | 測試順序錯：工具先儲存並重寫筆記，原始內容隨之更新，後來的筆記修改自然不衝突 | 改為先改筆記、再於工具儲存同一欄位；這同時證明待帶回的修改不會被覆蓋 |
| 前景實測先找不到「選擇資料夾」按鈕 | 介面自動化只看到外層視窗，對話框按鈕在另一個頂層視窗；檔名輸入框編號與預期不同 | 改用 Win32 以按鈕編號（確定=1、取消=2）操作；選擇改以初始資料夾驗證 |
| 前景判定失敗 | 目前工作階段沒有任何前景視窗（畫面鎖定或無人在座），不是對話框程式的缺陷 | 腳本在此情況明確失敗並說明原因，不降低標準、不跳過；需在已解鎖的桌面執行 `npm run test:folder-dialog` |

### 狀態
- 帶回修改：完成並通過自動測試。
- 資料夾視窗：可見、取消、選擇、前景皆已驗證（2026-11-01 在使用者已解鎖的桌面執行 `npm run test:folder-dialog` 通過）。

---

## 2026-11-01 我的小改變帶回

需求：把「我的小改變.md」的修改也帶回工具。

### 做法與取捨
- 每個項目匯出時附隱藏編號，用來辨識改字、勾選、新增（沒有編號的行）、刪除；清單與欄位定義只在 `markdownExporter.ts`（SSOT）。
- 刪除工具內也改過的項目視為衝突；只調整順序不匯入。
- 故意不匯入：固定標題、AI 建議區塊、標籤與關鍵因素（皆為衍生內容），以及在 Obsidian 從零建立的日記（沒有可對應的身分）。這些在筆記被重寫時仍保留副本。

### 問題與原因（RCA）
| 問題 | 原因 | 矯正 / 預防 |
| --- | --- | --- |
| 新增的項目看似沒被偵測（測試未過） | 欄位順序不同導致比較失敗：讀回的配方欄位順序與工具不同 | 比較一律用排序後的內容（`canon`），不依賴物件欄位順序 |
| 帶回後留下多餘的「保留的修改」副本 | 重寫時只比對原文，空白、隱藏編號、「尚未新增」提示行造成誤判為使用者修改 | 比對前先去除這三類差異；真正的文字修改仍會保留副本 |
| 測試把新項目插到錯的段落 | 測試資料錯誤，不是程式問題 | 修正測試位置，並確認未勾選的項目帶回後為停用 |

### 狀態
- 56 項單元測試通過。

---

## 2026-11-01 建立與更新交接文件 (handoff.md)

需求：建立與更新 `handoff.md`，使接續協作者與 AI 能即時接軌當前最新架構、測試與邊界。

### 做法
- 彙整當前系統架構（SSOT 邊界、資料流向、Windows 原生與 Obsidian 雙向連動）。
- 明列已完成之里程碑（專案精簡、雙向回寫、資料夾選擇視窗前景確效）。
- 列出標準測試與確效清單（`npm run lint`、`npm test`、`test:obsidian-browser`、`test:folder-dialog`）。
- 載明刻意不回寫之邊界設計與未來建議事項。
- 同步更新 `PROJECT_STRUCTURE.md`。

### 狀態
- `handoff.md` 已建立完成，測試維持 56 項綠燈。

---

## 2026-11-01 統整個人空間同步面板（方案 A 實施）

需求：使用者反映「個人空間」卡片出現在每個頁面上方，干擾寫日記等核心體驗，要求統整。

### 做法與取捨（方案 A）
- **職責分離 (MECE)**：
  - 非「備份」頁面（「今天」、「我的小改變」、「生活回顧」）：頂部僅呈現微型單行狀態列（高度約 36px），顯示保存狀態燈、文字反饋、筆記更新提示與直達備份連結，去除原有大卡片雜訊。
  - 「備份」頁面：完整收納個人空間卡片、登出、筆記存放位置、變更資料夾、手動同步、衝突處理與歷史版本還原。
- 移除全域頂部硬編碼的冗餘字串（`儲存後會自動存到個人空間；請留意下方的保存結果。`）。

### 問題與原因（RCA）
| 問題 | 原因 | 矯正 / 預防 |
| --- | --- | --- |
| `obsidian-browser.mjs` 等待文字逾時 | 微型狀態列原本簡寫為「筆記已更新」，與測試斷言「筆記資料夾已更新。」字串不一致 | 修正文字對齊「筆記資料夾已更新。」，確保各頁面即時反饋完整且精確 |
| 瀏覽器測試點擊「變更筆記位置」找不到按鈕 | 該按鈕已按方案 A 歸位至「備份」頁面，測試原先在「今天」頁面原地尋找 | 測試動作加入切換至「備份」頁面的自然導覽步驟 |
| `personal-browser.mjs` 在 Windows 提示找不到 headless shell | 啟動設定未指定 `channel: "chrome"`，導致未尋找本機既有 Chrome | 對齊 `obsidian-browser.mjs` 加入 `channel: "chrome"` 設定 |

### 狀態
- 56 項單元測試全過。
- `test:obsidian-browser` (1/1) 全過。
- `test:personal-browser` (2/2) 全過。

---

## 2026-11-01 GitHub Pages 自動化確效與部署設定

需求：部署到 GitHub Pages 並確保成功無異常。

### 做法與防禦
- **資源路徑防禦**：`vite.config.ts` 設定 `base: './'` 相對路徑，徹底防止 GitHub Pages 子目錄託管時產生的 `/assets/` 404 白屏問題。
- **配置警告修復**：修復 `vite.config.ts` 中的 `__dirname` 警告，改用標準 `import.meta.dirname`。
- **零樣板偏誤 (Zero Assumption Bias)**：專案依賴 `bun.lock` / `package.json`，在 GitHub Actions 工作流中明確避免無效的 `cache: 'npm'` 樣板。
- **部署前強制確效**：在 GitHub Actions 流水線中，必須先依序通過 `npm run lint`、`npm test` 與 `npm run build`，全部綠燈才觸發 `deploy-pages`。
- **目錄治理 (MECE)**：將 `.github/workflows/` 正式登記至 `PROJECT_STRUCTURE.md`。

### 狀態
- 本地打包 (`npm run build`) 驗證產出之 HTML 資源路徑正確無誤。
- 本地 56 項測試與型別檢查全數通過。

### CI 安裝失敗 RCA 與修復（2026-11-01）
- **現象**：GitHub Actions 在 `Install dependencies` 步驟失敗（npm error ERESOLVE）。
- **根因**：`package.json` 中手動鎖定過時的 `"esbuild": "^0.25.0"`，與頂層 `"vite": "^8.3.0"` 期望的 `esbuild@"^0.27.0 || ^0.28.0"` peer dependency 衝突。
- **矯正措施**：將 `package.json` 的 `esbuild` 依賴版本對齊提升至 `"^0.28.0"`；本地 `npm install --dry-run`、`npm run lint`、`npm test` 確效通過。

### GitHub Pages 純靜態代管 404 死鎖 RCA 與修復（2026-11-01）
- **現象**：在 GitHub Pages 上開啟時，畫面卡在「正在確認服務狀態… 無法確認服務狀態，請重試。 重試連線」。
- **根因**：GitHub Pages 為純靜態託管無 Node.js 後端服務，前端 `PersonalWorkspace` 於啟動時呼叫 `/api/auth/session` 收到 404 Not Found；原本邏輯在非 200 時拋出錯誤，且未做靜態站點降級處理，導致使用者被鎖在連線錯誤畫面。
- **矯正措施**：
  1. `PersonalWorkspace.tsx` 於啟動偵測時，若 `/api/auth/session` 回傳 404，自動判定為純靜態託管環境，立即無縫降級進入「純瀏覽器本地模式 (`mode: 'local'`)」，直接渲染主應用。
  2. 錯誤提示區塊新增「使用純瀏覽器模式」備援按鈕，即使完全離線或網路連線失敗，使用者也能隨時一鍵進入本地寫作與手冊介面。

---

## 2026-11-01 GitHub Pages 部署狀態幽靈死鎖 RCA 與清除

需求：排除 GitHub 倉庫側邊欄「Deployments ❌ github-pages」紅叉無法消除之異常。

### 問題與原因（RCA）
- **現象**：後續部署皆已成功，且線上站點正常，但 GitHub 倉庫側邊欄仍持續顯示紅叉 `❌ github-pages`。
- **根因**：首次失敗的部署紀錄（ID: `7470862944`）因時間偏差被標註為未來時間（`17:58:08 UTC+8`，顯示為 `in 25 minutes`）。GitHub Deployments 系統按時間降序將未來時間判定為最新，因而死鎖為當前 `Active` 狀態。
- **矯正措施（CAPA）**：
  1. 透過 GitHub REST API 明確刪除該筆未來時間戳記之失敗部署紀錄（ID: `7470862944`）及受污染之環境元資料。
  2. 重新觸發 GitHub Actions 流水線（Run ID: `41294504758`），全流程 43 秒綠燈建構完畢。
  3. 驗證最新 Deployment 狀態轉為 `success`，線上站點 HTTP 200 正常響應，側邊欄紅叉徹底清除。

---

## 2026-11-01 - 實作「一鍵安全關閉本機伺服器與相關依賴」

### 1. 需求背景 (Requirement)
- **使用者需求**：在 UI 中新增一個關閉伺服器的按鈕，可一鍵關閉背景運行的伺服器以及系統與相關依賴（選項 C：關閉 Node.js 伺服器、停止 Windows `LifeOS-Server` 排程任務、平穩關閉 Obsidian 視窗）。
- **UX/UI 規範**：
  - 專案面向無技術背景使用者，介面不露出底層技術術語（如 PID, Node, Express 等）。
  - 按鈕置於主導航欄頂層右側，名稱為「關閉系統與背景服務」。
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
- **使用者需求**：將先前生成的互動式全景知識圖譜（`Live-A-Better-Life.html`）嵌入系統 UI 中。
- **架構與 UX 考量**：
  - 遵循專案規範：主要導航路徑（今天 / 我的小改變 / 生活回顧 / 備份）維持極簡；次要功能收納於「更多」選單中。
  - 採用無縫嵌入架構：將單檔案知識圖譜置於 `public/knowledge-graph.html`，以專用組件 `KnowledgeGraphTab.tsx` 透過自適應高度之 iframe 嵌入。
  - 避免 React 重繪與全域事件污染，同時在頂部工具列提供「重新整理」與「在新分頁獨立全螢幕開啟」按鈕。
  - 在「使用說明」（`ArchifyDiagramTab.tsx`）頂部亦提供一鍵跳轉「查看系統全景知識圖譜」，雙向暢通。

---

## 2026-11-01 - 幾何運算優化：分項流程避障與允許空間精確居中

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
   - 透過檢查 `Live-A-Better-Life-Data/server-process.json` 與日誌時間戳，確認本機背景 Node.js 伺服器進程（PID 19848，監聽埠號 3002）是在今日 15:19 啟動並常駐於記憶體中。
   - 新端點 `/api/obsidian/changes` 是在 15:47（commit `44f88d9`）提交進代碼庫；
   - 關閉伺服器端點 `/api/system/shutdown` 則是在 19:58（commit `6448a3b`）提交進代碼庫。
2. **Express 路由靜態綁定特性**：
   - Node.js / Express 於進程啟動時將路由寫入記憶體中；常駐於背景的伺服器進程並不會隨 git commit 或前端代碼更新而自動重載後端路由。
   - 前端頁面嘗試呼叫新端點時，背景的舊伺服器進程找不到該路由，回傳 HTTP 404 Not Found。
3. **連鎖失效**：
   - 由於 `/api/system/shutdown` 回傳 404，關閉伺服器的指令未被舊進程接收與執行。

### 3. 矯正與預防措施 (CAPA)
1. 終止背景舊伺服器進程，載入最新代碼。
2. 凡代碼庫新增或修改後端 API 路由（`server/*.ts`）時，提醒重新啟動本機服務。

---

## 2026-11-01 - 導航與介面架構優化：關閉按鈕提升至最上層與完全移除「放鬆一下」

### 1. 需求背景 (Requirement)
- **使用者需求**：
  1. 「關閉系統與背景服務」按鈕應直接在主頁的最上層（頂部導航列）出現，不應隱藏在「更多」選單中。
  2. 「放鬆一下」是多餘且無必要的頁面，應完全移除。
- **UX/UI 規範**：
  - 維持 44x44px 最小觸控目標與無障礙標準，按鈕設置於桌面個人模式頂部右側，清晰可見，並具備防誤觸二次確認彈窗。
  - 在小螢幕（如 375px/390px）自適應隱藏非核心文字標籤，確保絕無水平溢出 (Zero Horizontal Overflow)。
  - 徹底貫徹 MECE 與 YAGNI 原則：移除死碼組件 `ZenSanctuary3D.tsx` 與相關型別定義。

### 2. 實施步驟與架構調整 (Execution & Architecture)
1. **頂部導航重構 (`Navbar.tsx`)**：
   - 將「關閉系統與背景服務」按鈕提升至 Header 最頂層右側，當 `isDesktop && onOpenShutdown` 時常駐渲染，具備紅色品牌警告色調與 `Power` 圖示。
   - 自「更多」二級選單中移除「放鬆一下」與「關閉系統與背景服務」，選單重構為三欄對稱網格（`使用說明`、`系統全景圖`、`使用狀態`）。
2. **死碼與依賴徹底清理 (MECE)**：
   - 刪除 `src/components/ZenSanctuary3D.tsx`。
   - `src/types.ts`：自 `ActiveTab` 聯合型別中移除 `"zen3d"`。
   - `src/App.tsx`：移除 `ZenSanctuary3D` 之 import 與條件渲染區塊。
   - `src/utils/architecture.ts`：移除 `ui_3d` 節點與 `e8` 連接線。
   - `Live-A-Better-Life.html` 與 `public/knowledge-graph.html`：移除 `ent_zen3d` 實體與所有雙向拓撲依賴。

---

## 2026-11-01 - 迴歸問題修復：知識圖譜 HTML 內嵌 JSON 語法損毀與自動化測試防禦

### 1. 問題現象 (Symptom)
瀏覽器開啟或載入知識圖譜時 Console 拋出迴歸語法錯誤：
```text
VM66:144 Uncaught SyntaxError: Expected ',' or '}' after property value in JSON at position 4465 (line 144 column 19)
    at JSON.parse (<anonymous>)
    at knowledge-graph.html:1121:30
```

### 2. 根因分析 (RCA - Root Cause Analysis)
1. **正規表達式盲目替換缺陷**：
   - 稍早在進行「放鬆一下」（`ent_zen3d`）組件清理時，對 `public/knowledge-graph.html` 與 `Live-A-Better-Life.html` 採用了正則字串替換。
   - 由於物件結構匹配邊界不夠嚴謹，僅替換了 `"id": "ent_zen3d",` 前綴，遺留了 `"id": "name": "放鬆一下 3D 禪境空間"` 等破裂語法，破壞了 `<script id="data-nodes">` 內的合法 JSON 格式。
2. **缺乏靜態 HTML 內嵌資料的測試覆蓋 (Test Blind Spot)**：
   - 先前的單元測試涵蓋了 TypeScript 與 Express 路由，但未對 HTML 內嵌的 `<script type="application/json">` 進行靜態解析檢驗，導致損毀代碼被漏過。

### 3. 矯正與預防措施 (CAPA)
1. **矯正措施 (Corrective Action)**：
   - 透過標準 `JSON.parse` 確效與重整，徹底移除破裂的 `ent_zen3d` 物件，並驗證 `data-nodes`（25 個節點）與 `data-categories` 全部解析正確。
2. **預防措施 (Preventive Action - Code-Crystallization)**：
   - 依據 RSI 自回歸進化協議，於 `tests/evolution.test.ts` 中新增物理剛性測試 `knowledge graph HTML files contain valid JSON data and connected topologies`。
   - 強制每次執行 `npm test` 時，自動檢查所有 HTML 檔案中的 `data-nodes` 與 `data-categories` 之 JSON 合法性，並斷言所有 `connections` 節點參照皆 100% 存在於拓撲中，杜絕再次發生 JSON 語法迴歸。單元測試數量增至 58 項。

---

## 2026-11-01 - 疑難排解：死碼依賴清理 (three/three-types)、啟用程序失敗對話框之根因分析 (RCA) 與平穩啟用修復

### 1. 問題現象 (Symptom)
使用者點擊「開啟我的日記」按鈕時，畫面未進入日記，而是跳出 Windows 系統警告對話框：
「暫時無法準備你的日記。請確認網路連線後再試一次。已儲存的記錄不會被重設。」

### 2. 根因分析 (RCA - Root Cause Analysis)
1. **殘留未清理之重型死依賴 (Three.js)**：
   - 稍早雖然刪除了 `ZenSanctuary3D.tsx` 前端組件，但 `package.json` 中依然殘留 `"three": "^0.187.0"` 與 `"@types/three": "^0.187.0"`，佔用不必要的套件空間。
2. **Bun Lockfile 與 esbuild 版本脫鉤**：
   - 稍早為對齊 Vite 8 將 `package.json` 中的 `esbuild` 提升至 `^0.28.0`，但未同步更新 `bun.lock`。
3. **協議處理器與啟用逾時連鎖反應**：
   - 登入頁面的「開啟我的日記」按鈕呼叫 `lifeos://open` 協議，觸發 Windows 執行 `deploy/windows/Activate.ps1 -ProjectRoot "..." -ShowErrors`。
   - `Activate.ps1` 在第二步驟執行 `Repair-LifeOSApplication`，其中 `bun install --frozen-lockfile` 遇到 lockfile 脫鉤拋出錯誤。
   - `Activate.ps1` 的 `catch` 區塊在偵測到例外時，依據 Windows 本機防禦設計呼叫 `[Windows.Forms.MessageBox]::Show` 彈出使用者友善的警告視窗，提示網路連線或重試。

### 3. 矯正與預防措施 (CAPA)
1. **完全清除死碼依賴 (Dead-Code Subtraction)**：
   - 自 `package.json` 中移除 `three` 與 `@types/three`。
   - 使用私有 Bun 1.4.4 重新安裝並同步 `bun.lock`（將 esbuild 對齊至 0.28.2），解除 frozen lockfile 異常。
2. **端到端啟用流程實機驗證**：
   - 於本機完整執行 `deploy/windows/Activate.ps1` 六大階段：
     - `[1/6]` 準備私有執行階段 (Node 24 / Bun 1.4.4)
     - `[2/6]` 套件安裝 (`bun install`)、型別檢查 (`tsc --noEmit`)、前端生產建置 (`vite build`)
     - `[3/6]` 註冊排程任務 (`LifeOS-Server`、`LifeOS-Backup`)
     - `[4/6]` 啟動並開啟個人工作空間
     - `[5/6]` 本機回環監聽（埠號 3002）、私有 ACL 權限、Obsidian 連線驗證全數 PASS
     - `[6/6]` 自動建立還原備份
   - 驗證本機伺服器於 `127.0.0.1:3002` 穩定提供服務，`/readyz` 回傳 `status: ready`，`/api/auth/session` 回傳 `configured: true`。
