import { EVOLUTION_POLICY } from "./evolution";
export const ARCHIFY_SPEC = {
  generator: "Life OS architecture SSOT",
  version: "2.0.0",
  title: "把日子過好 · 個人自我教練閉環系統 (Life OS)",
  description:
    "基於認知心理學、雙向連結與 If-Then 前置防線的個人成長作業系統架構圖",
  layers: [
    {
      id: "presentation",
      name: "1. 展示與沉浸交互層 (Presentation & Immersion Layer)",
      color: "#4d6b53",
      description:
        "響應式 React 19 SPA，支援多維可視化、Recharts 圖表與 Three.js 3D 空間",
    },
    {
      id: "cognitive",
      name: "2. 認知解耦與 AI 教練層 (Cognitive Kernel & AI Coprocessor)",
      color: "#2c5832",
      description: "事實與情緒分欄輸入、教練建議及使用者採納",
    },
    {
      id: "backend",
      name: "3. 數據與運行時後端層 (Data State & Runtime Backend)",
      color: "#b45309",
      description: "Local-First 本地離線快取、Express 4 API 與環境自我修復模組",
    },
    {
      id: "evolution",
      name: "4. 行為閉環與反饋演化層 (Closed-Loop Evolution Engine)",
      color: "#6b21a8",
      description: "根據實踐回報自動評估策略，更新狀態並回饋至日誌",
    },
  ],
  nodes: [
    // Layer 1: Presentation
    {
      id: "ui_daily",
      label: "今日反省日誌",
      sublabel: "DailyReflectionTab",
      layer: "presentation",
      icon: "HeartHandshake",
      tags: ["React 19", "雙向連結 [[ ]]", "標籤 #"],
      description:
        "每日引導式四步反省：好日子放大、卡關解題（事實/情緒分離）、平淡微光捕捉。",
      files: ["src/components/DailyReflectionTab.tsx"],
      apis: ["POST /api/coach"],
    },
    {
      id: "ui_os",
      label: "個人操作手冊中樞",
      sublabel: "PersonalOSTab",
      layer: "presentation",
      icon: "BookOpen",
      tags: ["If-Then", "避坑指南", "緊急錦囊"],
      description:
        "收納並管理經過驗證的行為反應策略，支援啟動/停用開關與晨間投影。",
      files: ["src/components/PersonalOSTab.tsx"],
    },
    {
      id: "ui_insights",
      label: "數據洞察與情緒模式",
      sublabel: "InsightsTab & Recharts",
      layer: "presentation",
      icon: "BarChart3",
      tags: ["Recharts", "30天走勢", "修復力指數"],
      description:
        "透過 Recharts 動態繪製 30 天狀態走勢圖、佔比圓餅圖與週間規律分析。",
      files: [
        "src/components/InsightsTab.tsx",
        "src/components/MoodPatternsVisualization.tsx",
      ],
    },
    {
      id: "ui_export",
      label: "Obsidian 整合匯出",
      sublabel: "ObsidianExportTab",
      layer: "presentation",
      icon: "FolderDown",
      tags: ["Markdown", "YAML Frontmatter"],
      description:
        "生成原生相容 Obsidian Vault 的 Markdown 筆記，包含反向連結與每日元數據。",
      files: ["src/components/ObsidianExportTab.tsx"],
    },

    // Layer 2: Cognitive Kernel
    {
      id: "cog_decouple",
      label: "認知解耦處理器",
      sublabel: "Cognitive Decoupler",
      layer: "cognitive",
      icon: "Cpu",
      tags: ["事實/情緒分離", "正念歸因"],
      description:
        "提供分開記錄客觀事實與主觀情緒的表單，不自動判定內容真偽或情緒比例。",
      files: ["src/components/DailyReflectionTab.tsx"],
    },
    {
      id: "ai_gemini",
      label: "Gemini AI 認知教練",
      sublabel: "Server AI / rules fallback",
      layer: "cognitive",
      icon: "Sparkles",
      tags: ["@google/genai", "心理學歸因", "結構化建議"],
      description:
        "分析日誌內核，提供歸因建議、If-Then 策略生成與共情正向回饋。",
      files: ["server.ts"],
      apis: ["POST /api/coach"],
    },
    {
      id: "cog_compiler",
      label: "If-Then 行為編譯器",
      sublabel: "Behavioral Intent Compiler",
      layer: "cognitive",
      icon: "Workflow",
      tags: ["執行意圖", "使用者採納"],
      description:
        "由使用者採納教練建議，將 If / Then 內容保存為可啟用的策略；不自動執行現實行動。",
      files: ["src/components/PersonalOSTab.tsx"],
    },

    // Layer 3: Backend & Data
    {
      id: "db_local",
      label: "工作區資料保存",
      sublabel: "Browser / personal SQLite",
      layer: "backend",
      icon: "Database",
      tags: ["Local-First", "零網路延遲", "安全隱私"],
      description:
        "本機模式保存於瀏覽器；個人模式保存後自動更新 SQLite。策略回報與演化紀錄隨工作區備份與還原。",
      files: ["src/App.tsx", "src/utils/storage.ts"],
    },
    {
      id: "srv_express",
      label: "Express 運行時伺服器",
      sublabel: "Node.js / tsx API Proxy",
      layer: "backend",
      icon: "Server",
      tags: ["Express 4.21", "Vite 中間件", "環境探針"],
      description:
        "託管前端靜態資源、封裝 AI Studio Gemini API 請求並阻絕 Key 外洩。",
      files: ["server.ts"],
    },
    {
      id: "sys_health",
      label: "自檢修復引擎",
      sublabel: "Auto Setup & Health Check",
      layer: "backend",
      icon: "CheckCircle2",
      tags: ["環境檢查", "依賴自檢", "配置修復"],
      description:
        "啟動時檢測環境變數、模組安裝狀態與系統網路健全度，支援一鍵配置修復。",
      files: ["scripts/bootstrap.ts", "src/components/SystemHealthModal.tsx"],
      apis: ["GET /api/system/status", "POST /api/system/setup"],
    },

    // Layer 4: Evolution Loop
    {
      id: "loop_evolution",
      label: "閉環演化回饋引擎",
      sublabel: "Closed-Loop Learning",
      layer: "evolution",
      icon: "RotateCcw",
      tags: ["實踐回報", "規則評估", "自動暫停"],
      description: EVOLUTION_POLICY.description,
      files: ["src/utils/evolution.ts", "src/components/StrategyFeedback.tsx"],
    },
  ],
  edges: [
    {
      id: "e1",
      source: "ui_daily",
      target: "cog_decouple",
      label: "輸入日誌",
      type: "data",
      animated: true,
    },
    {
      id: "e2",
      source: "cog_decouple",
      target: "ai_gemini",
      label: "請求 AI 輔助",
      type: "data",
      animated: true,
    },
    {
      id: "e3",
      source: "ai_gemini",
      target: "srv_express",
      label: "後端代理調用",
      type: "control",
    },
    {
      id: "e4",
      source: "ai_gemini",
      target: "cog_compiler",
      label: "提煉行動配方",
      type: "data",
      animated: true,
    },
    {
      id: "e5",
      source: "cog_compiler",
      target: "ui_os",
      label: "使用者採納後保存策略",
      type: "data",
    },
    {
      id: "e6",
      source: "ui_daily",
      target: "db_local",
      label: "本地持久化",
      type: "data",
    },
    {
      id: "e7",
      source: "db_local",
      target: "ui_insights",
      label: "提供 30 天數據",
      type: "data",
    },
    {
      id: "e9",
      source: "db_local",
      target: "ui_export",
      label: "雙向連結筆記匯出",
      type: "data",
    },
    {
      id: "e10",
      source: "srv_express",
      target: "sys_health",
      label: "健康監控探針",
      type: "control",
    },
    {
      id: "e11",
      source: "ui_os",
      target: "loop_evolution",
      label: "策略回報與自動評估",
      type: "feedback",
    },
    {
      id: "e12",
      source: "loop_evolution",
      target: "ui_daily",
      label: "啟用策略顯示於日誌",
      type: "feedback",
      animated: true,
    },
  ],
};

export const LOOP_STEPS = [
  { node: "ui_daily", label: "記錄反省", actor: "使用者" },
  { node: "ai_gemini", label: "產生建議（AI 或規則備援）", actor: "系統" },
  { node: "ui_os", label: "採納並啟用策略", actor: "使用者" },
  { node: "db_local", label: "保存工作區資料", actor: "系統" },
  {
    node: "loop_evolution",
    label: "回報實踐 → 自動評估 → 更新策略狀態",
    actor: "使用者與系統",
  },
  { node: "ui_daily", label: "啟用策略回饋到日誌，再次反省", actor: "系統" },
];
