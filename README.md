# 把日子過好 · 個人自我教練與閉環知識庫 (Personal Operating System)

> **「把日子過好，其實就是過好每一個今天。把人生當作一個可以持續迭代的產品。」**

本專案是一套基於**認知重塑**、**直覺條件式每日反省**、**Obsidian 閉環知識庫**與 **AI 認知副處理器（Cognitive Co-processor）**的人生操作系統（Life OS）。

---

## 🌟 核心理念與設計哲學

現代人在經歷高強度的日常後，睡前往往處於「認知枯竭（Ego Depletion）」狀態。如果要求填寫繁瑣冗長的反省表格，極易因阻力過大而放棄。本系統透過**「化繁為簡」**與**「閉環反饋」**，創造了一套可持續運轉一生的自我修復機制：

1. **極低阻力的第一層啟動點：** 「我今天過得好嗎？」以直覺選擇題（🟢 好 / 🔴 不好 / 🟡 普通）跨越每日實踐門檻。
2. **條件式分流（If-Then 決策樹）：**
   - 🟢 **過得好 ➔ 提煉成功配方：** 把偶然的好心情轉化為可複製的生活公式（例如：`充足睡眠 + 早餐蛋白質 = 高效產出`）。
   - 🔴 **過得不好 ➔ 切換至解題模式：** 藉由阿德勒心理學將「客觀事實」與「主觀情緒」剝離，不進行自我批判，將挫折視為系統優化的「測試數據」。
   - 🟡 **平凡如水 ➔ 捕捉微小順利：** 人生約有 60% 是平淡的，在此刻敏銳捕捉一杯熱咖啡、一陣涼風的微小片刻，並設計儀式將其放大。
3. **知識庫必須「回饋」到日常（閉環系統）：**
   - 晚上冷靜提煉的經驗，隔天早晨透過 Obsidian 區塊引用（Transclusion）自動投影在日記最頂部（**🛡️ 晨間防禦機制**），在白天以「If-Then」觸發器即時干預行為。
4. **AI 認知副處理器（Cognitive Co-processor）：**
   - 當大腦疲倦、想不出「改善辦法」或「放大儀式」時，一鍵呼叫 AI。AI 以福格行為模型與課題分離視角，提供阻力趨近於零的微小行動設計。

---

## 📁 Obsidian 知識庫目錄架構

本系統完全遵循標準純文字 Markdown 格式，本地 Obsidian Vault 結構如下：

```text
├── 01_日誌/                     # 存放每日 YYYY-MM-DD.md 日記
│   ├── 2026-10-25.md
│   ├── 2026-10-26.md
│   └── ...
├── 02_模版/                     # Obsidian 快速套用的核心模版
│   └── 每日自我教練模版.md
└── 03_知識庫/                   # 系統大腦中樞與 AI 行為守則
    ├── 個人操作手冊.md           # 匯集本週 If-Then、外掛提問、快樂配方、避坑指南
    └── AI教練行為準則.md         # 讓任何 AI IDE / Agent 讀取即能成為專屬教練
```

### 每日日誌 Markdown 格式（含自動回饋投影）

```markdown
> [!info] 🛡️ 今日防禦與策略 (系統自動回饋)
> ![[個人操作手冊#⚡ 本週 If-Then 策略]]
> ![[個人操作手冊#🎯 本週短期外掛提問]]

---
### 狀態檢核：我今天過得好嗎？

#### 🟢 狀態：好
- **好在哪裡？**
- **如何保持 / 成功配方？** *(待 AI 建議...)*

#### 🔴 狀態：不好
- **不好在哪裡？**
  - 客觀事實：
  - 主觀情緒：
- **什麼原因？**
- **明天有什麼辦法改善？** *(待 AI 建議...)*

#### 🟡 狀態：普通
- **今天有哪個微小瞬間讓我感覺平靜或順利？**
- **如何放大這個瞬間？** *(待 AI 建議...)*

---
### 🏷️ 今日標籤與數據
- 狀態標籤： #狀態/🟢好 #狀態/🔴不好 #狀態/🟡普通
- 關鍵因素： [[散步]] [[老闆]] [[睡眠品質]]
```

---

## 🤖 AI IDE / Agent 協作指南 (Trae, Cline, Cursor, Qoder)

你只需將本專案的目錄以 Workspace 開啟，AI Agent 即會根據 `03_知識庫/AI教練行為準則.md` 扮演你的認知副處理器：

### 日常對話 SOP
1. 在日記中記錄下事實、情緒或原因。
2. 對 AI 輸入：`幫我完成今日復盤` 或 `/coach`。
3. AI 自動檢索 `01_日誌` 與 `03_知識庫/個人操作手冊.md`，並以 **「If [情境], Then [微小動作]」** 輸出極低門檻的建議。
4. 一鍵確認並自動寫入當日日記。

---

## 🛠️ 技術棧與架構

- **前端：** React 19、Vite 8、Tailwind CSS v4、Motion、Lucide React、Canvas Confetti
- **後端：** Express、Node.js、TypeScript (`tsx`)
- **AI 驅動：** Google Gen AI SDK (`@google/genai`) 使用 `gemini-3.8-flash`
- **雲端部署：** Google Cloud Run (AI Studio Build Serverless Container)

---

## 🚀 本地開發與構建

### 1. 安裝相依套件
```bash
npm install
```

### 2. 環境變數設定
複製 `.env.example` 為 `.env`：
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
開啟瀏覽器訪問 `http://localhost:3000`。

### 4. 編譯與生產部署
```bash
npm run build
npm run start
```

---

## ☁️ 雲端服務端點

- **開發預覽環境 (Development URL)：**  
  [https://ais-dev-pgaclsj2evdqfb5hm722b5-405604763585.asia-northeast1.run.app](https://ais-dev-pgaclsj2evdqfb5hm722b5-405604763585.asia-northeast1.run.app)
- **公開分享環境 (Shared App URL)：**  
  [https://ais-pre-pgaclsj2evdqfb5hm722b5-405604763585.asia-northeast1.run.app](https://ais-pre-pgaclsj2evdqfb5hm722b5-405604763585.asia-northeast1.run.app)

---

## 📄 授權說明
Apache-2.0 License.

## 個人使用版本的可靠性與驗證

開發計畫、驗收門檻及公開部署前置條件見 [可靠性計畫](docs/RELIABILITY_PLAN.md)。

- 新使用者從空白日誌與手冊開始；不再自動加入示範紀錄。舊版資料保留，無法自動判斷的示範日誌需先備份再人工整理。
- 資料僅存於目前瀏覽器；按日期自動保存草稿，按「儲存今日日誌」才計入統計。清除網站資料前請匯出 JSON 備份。
- 匯入會先驗證格式、詢問覆蓋，再保存一份覆蓋前備份；可在匯出頁下載並重新匯入。失敗不替換目前已保存資料。還原後使用新的草稿空間，舊草稿保留於瀏覽器但不自動套用到還原資料。
- 舊版保存鍵保留供復原；成功寫入新版後，以 `life_os_data_v2` 為準。其他分頁若已保存變更，當前分頁會拒絕覆蓋，請先下載尚未保存內容並重載。
- AI 卡片區分 Gemini、伺服器規則備援及本地備援。未設定金鑰或遠端失敗時，備援可繼續使用；這不表示 Gemini 已驗證。Obsidian 提供手動 Markdown 匯出，沒有雙向同步。

專案使用 `bun.lock`，可用 Bun 1.4.4 執行 `bun install --frozen-lockfile`。Node 24 已驗證。

```bash
npm test                 # 資料保存、備份、API/AI 契約與故障測試
npm run lint             # TypeScript 檢查
npm run test:browser     # 建置後啟動獨立正式模式伺服器，跑 Chromium 流程
```

瀏覽器測試需要 Chromium：可執行 `npx playwright install chromium` 安裝，或以 `CHROMIUM_PATH` 指定既有執行檔；Linux 預設會優先使用 `/usr/bin/chromium`。必要時先安裝 Chromium 所需的系統套件。測試使用獨立瀏覽器 context，結束會停止自己啟動的服務。

`TEST_SERVER_MODE=development node tests/browser.mjs` 可驗證開發模式；`TEST_BASE_URL` 可指定已啟動的測試服務（必須確保沒有真實 Gemini 費用與敏感資料）。預設測試服務使用 3100 埠並關閉遠端金鑰。

目前仍是本機個人使用架構。登入、伺服器持久化、跨使用者隔離、限流/配額及真實 Gemini/部署驗收完成前，不應直接開放為公開付費 AI 服務。

## 個人多裝置（單一擁有者）

已加入登入保護、SQLite 版本化保存、手動跨裝置同步、最近 30 次歷史備份與離線復原工具。完整設定、密碼配置、持久磁碟要求及驗收步驟見 [個人多裝置部署](docs/PERSONAL_DEPLOYMENT.md)。個人模式的瀏覽器編輯暫存使用 sessionStorage；必須明確上傳才會保存至服務端。

本機模式仍為預設，API 僅接受 loopback。個人模式需要擁有者先設定密碼，沒有預設密碼。SQLite 版本只支援單實例、持久磁碟主機，不能直接依賴 Cloud Run 的暫存容器磁碟。尚未部署正式服務，也尚未以真實金鑰驗證 Gemini。

## Windows 本機運行（目前選定）

使用者選擇先在 Windows 電腦供自己使用。請依 [Windows 啟動與排程](docs/WINDOWS_LOCAL.md) 操作；腳本只啟動 loopback 個人服務，資料放在專案外，不會開防火牆或對外發布。雲端無法直接操作 D: 路徑，Windows 排程與 ACL 須在實機驗收。

## 一鍵啟用（最新入口）

在 Windows 雙擊根目錄 `Start-LifeOS.cmd`，會自動準備使用者私有工具、安裝建置、初始化帳號、登記排程、啟動、就緒驗證、備份並開啟前端。無須手動貼 PowerShell 指令或輸入登入密碼。啟用採信任目前 Windows 使用者的一次性本機登入連結，僅限 127.0.0.1；不適用公開服務。詳見 [Windows 手冊](docs/WINDOWS_LOCAL.md)。Windows 實機排程／ACL／工具下載仍待驗收，不會繞過系統執行政策。
