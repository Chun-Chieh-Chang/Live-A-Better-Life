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
