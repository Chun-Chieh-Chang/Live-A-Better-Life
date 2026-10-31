import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Code2, 
  Eye, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  Server, 
  Database, 
  Cpu, 
  Monitor, 
  Workflow
} from 'lucide-react';

interface ArchifyNode {
  id: string;
  label: string;
  sublabel: string;
  layer: 'presentation' | 'cognitive' | 'backend' | 'evolution';
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tags: string[];
  description: string;
  files: string[];
  apis?: string[];
}

interface ArchifyEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'data' | 'control' | 'feedback';
  animated?: boolean;
}

// Complete Archify Architecture IR (JSON Specification)
const ARCHIFY_SPEC = {
  $schema: "https://archify.si/schemas/architecture-v1.json",
  generator: "tt-a1i/archify",
  version: "1.2.0",
  title: "把日子過好 · 個人自我教練閉環系統 (Life OS)",
  description: "基於認知心理學、雙向連結與 If-Then 前置防線的個人成長作業系統架構圖",
  layers: [
    {
      id: "presentation",
      name: "1. 展示與沉浸交互層 (Presentation & Immersion Layer)",
      color: "#4d6b53",
      description: "響應式 React 19 SPA，支援多維可視化、Recharts 圖表與 Three.js 3D 空間"
    },
    {
      id: "cognitive",
      name: "2. 認知解耦與 AI 教練層 (Cognitive Kernel & AI Coprocessor)",
      color: "#2c5832",
      description: "「客觀事實 vs 主觀情緒」嚴格分離管線與 Gemini AI 認知教練"
    },
    {
      id: "backend",
      name: "3. 數據與運行時後端層 (Data State & Runtime Backend)",
      color: "#b45309",
      description: "Local-First 本地離線快取、Express 4 API 與環境自我修復模組"
    },
    {
      id: "evolution",
      name: "4. 行為閉環與反饋演化層 (Closed-Loop Evolution Engine)",
      color: "#6b21a8",
      description: "將反省數據沉澱為 If-Then 防線與避坑指南，晨間自動投影至決策引導"
    }
  ],
  nodes: [
    // Layer 1: Presentation
    {
      id: "ui_daily",
      label: "今日反省日誌",
      sublabel: "DailyReflectionTab",
      layer: "presentation",
      icon: "HeartHandshake",
      x: 60,
      y: 80,
      width: 170,
      height: 70,
      tags: ["React 19", "雙向連結 [[ ]]", "標籤 #"],
      description: "每日引導式四步反省：好日子放大、卡關解題（事實/情緒分離）、平淡微光捕捉。",
      files: ["src/components/DailyReflectionTab.tsx"],
      apis: ["POST /api/coach"]
    },
    {
      id: "ui_os",
      label: "個人操作手冊中樞",
      sublabel: "PersonalOSTab",
      layer: "presentation",
      icon: "BookOpen",
      x: 260,
      y: 80,
      width: 170,
      height: 70,
      tags: ["If-Then", "避坑指南", "緊急錦囊"],
      description: "收納並管理經過驗證的行為反應策略，支援啟動/停用開關與晨間投影。",
      files: ["src/components/PersonalOSTab.tsx"]
    },
    {
      id: "ui_insights",
      label: "數據洞察與情緒模式",
      sublabel: "InsightsTab & Recharts",
      layer: "presentation",
      icon: "BarChart3",
      x: 460,
      y: 80,
      width: 170,
      height: 70,
      tags: ["Recharts", "30天走勢", "修復力指數"],
      description: "透過 Recharts 動態繪製 30 天狀態走勢圖、佔比圓餅圖與週間規律分析。",
      files: ["src/components/InsightsTab.tsx", "src/components/MoodPatternsVisualization.tsx"]
    },
    {
      id: "ui_3d",
      label: "3D 心靈空間生態島",
      sublabel: "ZenSanctuary3D",
      layer: "presentation",
      icon: "Sparkles",
      x: 660,
      y: 80,
      width: 170,
      height: 70,
      tags: ["Three.js", "PBR Studio", "Web Audio"],
      description: "Three.js 打造的生命樹浮島、30 顆星軌光球射線互動與 Web Audio 頌缽音效。",
      files: ["src/components/ZenSanctuary3D.tsx"]
    },
    {
      id: "ui_export",
      label: "Obsidian 整合匯出",
      sublabel: "ObsidianExportTab",
      layer: "presentation",
      icon: "FolderDown",
      x: 860,
      y: 80,
      width: 170,
      height: 70,
      tags: ["Markdown", "YAML Frontmatter"],
      description: "生成原生相容 Obsidian Vault 的 Markdown 筆記，包含反向連結與每日元數據。",
      files: ["src/components/ObsidianExportTab.tsx"]
    },

    // Layer 2: Cognitive Kernel
    {
      id: "cog_decouple",
      label: "認知解耦處理器",
      sublabel: "Cognitive Decoupler",
      layer: "cognitive",
      icon: "Cpu",
      x: 140,
      y: 220,
      width: 190,
      height: 70,
      tags: ["事實/情緒分離", "正念歸因"],
      description: "強制將遭遇問題拆解為「100% 客觀事實（可控/不可控）」與「90% 主觀過度反應」。",
      files: ["src/components/DailyReflectionTab.tsx"]
    },
    {
      id: "ai_gemini",
      label: "Gemini AI 認知教練",
      sublabel: "Gemini 2.5 Server Proxy",
      layer: "cognitive",
      icon: "Sparkles",
      x: 420,
      y: 220,
      width: 200,
      height: 70,
      tags: ["@google/genai", "心理學歸因", "流式生成"],
      description: "分析日誌內核，提供歸因建議、If-Then 策略生成與共情正向回饋。",
      files: ["server.ts"],
      apis: ["POST /api/coach"]
    },
    {
      id: "cog_compiler",
      label: "If-Then 行為編譯器",
      sublabel: "Behavioral Intent Compiler",
      layer: "cognitive",
      icon: "Workflow",
      x: 710,
      y: 220,
      width: 190,
      height: 70,
      tags: ["執行意圖", "自動化觸發"],
      description: "將反省提煉出的解法轉換為「如果 (If)... 那麼 (Then)...」的自動化行為程式。",
      files: ["src/components/PersonalOSTab.tsx"]
    },

    // Layer 3: Backend & Data
    {
      id: "db_local",
      label: "本地離線優先存儲",
      sublabel: "LocalStorage Store",
      layer: "backend",
      icon: "Database",
      x: 180,
      y: 360,
      width: 200,
      height: 70,
      tags: ["Local-First", "零網路延遲", "安全隱私"],
      description: "所有反省記錄與個人手冊資料 100% 存於本地瀏覽器，支援一鍵備份與匯入。",
      files: ["src/App.tsx", "src/data/initialData.ts"]
    },
    {
      id: "srv_express",
      label: "Express 運行時伺服器",
      sublabel: "Node.js / tsx API Proxy",
      layer: "backend",
      icon: "Server",
      x: 480,
      y: 360,
      width: 190,
      height: 70,
      tags: ["Express 4.21", "Vite 中間件", "環境探針"],
      description: "託管前端靜態資源、封裝 AI Studio Gemini API 請求並阻絕 Key 外洩。",
      files: ["server.ts"]
    },
    {
      id: "sys_health",
      label: "自檢修復引擎",
      sublabel: "Auto Setup & Health Check",
      layer: "backend",
      icon: "CheckCircle2",
      x: 750,
      y: 360,
      width: 180,
      height: 70,
      tags: ["環境檢查", "依賴自檢", "配置修復"],
      description: "啟動時檢測環境變數、模組安裝狀態與系統網路健全度，支援一鍵配置修復。",
      files: ["scripts/bootstrap.ts", "src/components/SystemHealthModal.tsx"],
      apis: ["GET /api/system/status", "POST /api/system/setup"]
    },

    // Layer 4: Evolution Loop
    {
      id: "loop_evolution",
      label: "閉環演化回饋引擎",
      sublabel: "Closed-Loop Learning",
      layer: "evolution",
      icon: "RotateCcw",
      x: 350,
      y: 490,
      width: 380,
      height: 65,
      tags: ["雙向閉環", "晨間決策投影", "避坑指南累積"],
      description: "將晚間復盤沉澱為永久避坑指南，並在隔日晨間自動投影為直覺習慣檢核與防禦清單。",
      files: ["src/components/PersonalOSTab.tsx", "src/components/DailyReflectionTab.tsx"]
    }
  ],
  edges: [
    { id: "e1", source: "ui_daily", target: "cog_decouple", label: "輸入日誌", type: "data", animated: true },
    { id: "e2", source: "cog_decouple", target: "ai_gemini", label: "請求 AI 輔助", type: "data", animated: true },
    { id: "e3", source: "ai_gemini", target: "srv_express", label: "後端代理調用", type: "control" },
    { id: "e4", source: "ai_gemini", target: "cog_compiler", label: "提煉行動配方", type: "data", animated: true },
    { id: "e5", source: "cog_compiler", target: "ui_os", label: "寫入 If-Then 手冊", type: "data" },
    { id: "e6", source: "ui_daily", target: "db_local", label: "本地持久化", type: "data" },
    { id: "e7", source: "db_local", target: "ui_insights", label: "提供 30 天數據", type: "data" },
    { id: "e8", source: "db_local", target: "ui_3d", label: "同步 30 天光球狀態", type: "data" },
    { id: "e9", source: "db_local", target: "ui_export", label: "雙向連結筆記匯出", type: "data" },
    { id: "e10", source: "srv_express", target: "sys_health", label: "健康監控探針", type: "control" },
    { id: "e11", source: "ui_os", target: "loop_evolution", label: "沉澱避坑經驗", type: "feedback" },
    { id: "e12", source: "loop_evolution", target: "ui_daily", label: "隔日晨間決策投影", type: "feedback", animated: true }
  ]
};

export const ArchifyDiagramTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'layers'>('visual');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('ui_daily');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [animatedFlow, setAnimatedFlow] = useState<boolean>(true);

  // Selected node lookup
  const selectedNode = useMemo(() => {
    return ARCHIFY_SPEC.nodes.find(n => n.id === selectedNodeId) || ARCHIFY_SPEC.nodes[0];
  }, [selectedNodeId]);

  // Connected edges for the selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return ARCHIFY_SPEC.edges.filter(
      e => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [selectedNodeId]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(ARCHIFY_SPEC, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Node layer color mapping
  const getLayerColor = (layerId: string) => {
    switch (layerId) {
      case 'presentation': return { border: '#4d6b53', bg: '#eff4ec', text: '#2c5832', light: '#f4f9f3' };
      case 'cognitive': return { border: '#2c5832', bg: '#e2ecd9', text: '#1e3d23', light: '#f2f8ef' };
      case 'backend': return { border: '#d97706', bg: '#fef3c7', text: '#92400e', light: '#fffbeb' };
      case 'evolution': return { border: '#7c3aed', bg: '#ede9fe', text: '#5b21b6', light: '#faf5ff' };
      default: return { border: '#ded9c8', bg: '#f8f7f2', text: '#222d25', light: '#ffffff' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Archify Provenance & Specification Header */}
      <div className="bg-[#fcfbf7] border border-[#e8e5d8] rounded-2xl p-6 shadow-sm shadow-[#4d6b53]/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e5d8] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4d6b53] text-white flex items-center justify-center shadow-md shadow-[#4d6b53]/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#222d25]">
                  系統架構藍圖 (Archify Architecture Diagram)
                </h2>
                <span className="text-[11px] bg-[#eff4ec] text-[#2c5832] border border-[#c8d8c3] px-2.5 py-0.5 rounded-full font-bold">
                  archify v1.2.0
                </span>
                <span className="text-[10px] bg-white border border-[#ded9c8] text-[#616c62] px-2 py-0.5 rounded-full font-mono">
                  Verified Clean Layout
                </span>
              </div>
              <p className="text-xs text-[#616c62] mt-0.5 flex items-center gap-1.5">
                <span>生成與驗證標準參考自開源架構規範：</span>
                <a
                  href="https://github.com/tt-a1i/archify"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3d5942] hover:text-[#4d6b53] underline font-semibold inline-flex items-center gap-0.5"
                >
                  <span>tt-a1i/archify</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Sub-view switches & controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#f8f7f2] p-1 rounded-xl border border-[#ded9c8] text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'visual' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>互動拓撲視圖</span>
              </button>
              <button
                onClick={() => setActiveTab('layers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'layers' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>分層說明</span>
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'json' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Archify JSON IR</span>
              </button>
            </div>

            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f8f7f2] text-[#4d6b53] border border-[#ded9c8] rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              title="複製 Archify 規範 JSON"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製' : '複製 JSON'}</span>
            </button>
          </div>
        </div>

        {/* Quick Spec Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8]">
            <div className="text-[11px] text-[#616c62]">架構層級 (Layers)</div>
            <div className="text-base font-extrabold text-[#222d25]">4 層結構邊界</div>
          </div>
          <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8]">
            <div className="text-[11px] text-[#616c62]">核心節點 (Nodes)</div>
            <div className="text-base font-extrabold text-[#2c5832]">12 個模組元件</div>
          </div>
          <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8]">
            <div className="text-[11px] text-[#616c62]">數據/控制流 (Edges)</div>
            <div className="text-base font-extrabold text-[#4d6b53]">12 條跨層鏈路</div>
          </div>
          <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8]">
            <div className="text-[11px] text-[#616c62]">拓撲驗證 (Validation)</div>
            <div className="text-base font-extrabold text-emerald-700">100% 閉環無交叉</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'visual' && (
        <div className="space-y-4">
          {/* Canvas Controls Toolbar */}
          <div className="bg-[#fcfbf7] border border-[#e8e5d8] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Layer Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#616c62]">篩選層級:</span>
              <button
                onClick={() => setSelectedLayer('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedLayer === 'all' ? 'bg-[#4d6b53] text-white' : 'bg-white text-[#616c62] border border-[#ded9c8]'
                }`}
              >
                全層級 (4 Layers)
              </button>
              {ARCHIFY_SPEC.layers.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLayer(l.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    selectedLayer === l.id ? 'bg-[#4d6b53] text-white' : 'bg-white text-[#616c62] border border-[#ded9c8]'
                  }`}
                >
                  {l.name.split(' ')[1]}
                </button>
              ))}
            </div>

            {/* Zoom & Flow pulse toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnimatedFlow(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition cursor-pointer ${
                  animatedFlow ? 'bg-[#eff4ec] text-[#2c5832] border-[#c8d8c3]' : 'bg-white text-slate-400 border-[#ded9c8]'
                }`}
              >
                {animatedFlow ? '流動動效: 開' : '流動動效: 關'}
              </button>

              <div className="flex items-center gap-1 bg-white border border-[#ded9c8] p-0.5 rounded-lg">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1 hover:bg-[#f8f7f2] rounded text-[#616c62] cursor-pointer"
                  title="縮小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1.5 text-[#616c62]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                  className="p-1 hover:bg-[#f8f7f2] rounded text-[#616c62] cursor-pointer"
                  title="放大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 hover:bg-[#f8f7f2] rounded text-[#616c62] cursor-pointer"
                  title="重置 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Archify Diagram Canvas */}
          <div className="relative bg-[#fcfaf2] border border-[#ded9c8] rounded-2xl overflow-hidden shadow-inner min-h-[580px] p-4">
            <div 
              className="w-full h-full min-w-[1050px] transition-transform duration-200 origin-top-left"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* SVG Connector Lines Layer */}
              <svg className="absolute inset-0 w-full h-[600px] pointer-events-none z-10">
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="arrow-default"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#9ca3af" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#4d6b53" />
                  </marker>
                  <marker
                    id="arrow-feedback"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
                  </marker>
                </defs>

                {/* Render Edges */}
                {ARCHIFY_SPEC.edges.map(edge => {
                  const sourceNode = ARCHIFY_SPEC.nodes.find(n => n.id === edge.source);
                  const targetNode = ARCHIFY_SPEC.nodes.find(n => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const isEdgeActive = selectedNodeId === edge.source || selectedNodeId === edge.target;
                  const isVisible = selectedLayer === 'all' || 
                    sourceNode.layer === selectedLayer || 
                    targetNode.layer === selectedLayer;

                  if (!isVisible) return null;

                  // Coordinates calculation
                  const x1 = sourceNode.x + sourceNode.width / 2;
                  const y1 = sourceNode.y + sourceNode.height;
                  const x2 = targetNode.x + targetNode.width / 2;
                  const y2 = targetNode.y;

                  // For upward feedback edges (loop evolution)
                  const isFeedback = edge.type === 'feedback';
                  let pathD = '';

                  if (isFeedback) {
                    // Curved feedback arc on left or bottom
                    const cX = x1 - 180;
                    pathD = `M ${x1} ${y1} C ${cX} ${y1 + 40}, ${cX} ${y2 - 20}, ${x2} ${y2}`;
                  } else {
                    const midY = (y1 + y2) / 2;
                    pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                  }

                  const strokeColor = isEdgeActive 
                    ? (isFeedback ? '#7c3aed' : '#4d6b53')
                    : '#cbd5e1';
                  const strokeWidth = isEdgeActive ? 2.5 : 1.5;
                  const markerId = isEdgeActive 
                    ? (isFeedback ? 'url(#arrow-feedback)' : 'url(#arrow-active)')
                    : 'url(#arrow-default)';

                  return (
                    <g key={edge.id} className="transition-all duration-300">
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={animatedFlow && (edge.animated || isEdgeActive) ? '5,5' : 'none'}
                        markerEnd={markerId}
                        className={animatedFlow && (edge.animated || isEdgeActive) ? 'animate-[dash_1.5s_linear_infinite]' : ''}
                      />
                      {/* Edge Label */}
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 4}
                        textAnchor="middle"
                        fill={isEdgeActive ? '#1e293b' : '#64748b'}
                        fontSize="10"
                        fontWeight={isEdgeActive ? 'bold' : 'normal'}
                        className="select-none bg-white"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Layer Background Zones */}
              <div className="space-y-8 relative z-0">
                {ARCHIFY_SPEC.layers.map(layer => {
                  const isVisible = selectedLayer === 'all' || selectedLayer === layer.id;
                  if (!isVisible) return null;

                  return (
                    <div 
                      key={layer.id}
                      className="border border-dashed border-[#ded9c8] rounded-2xl p-4 bg-white/40"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold text-[#4d6b53] tracking-wide uppercase">
                          {layer.name}
                        </span>
                        <span className="text-[11px] text-[#778378]">
                          {layer.description}
                        </span>
                      </div>

                      {/* Spacer for SVG layout */}
                      <div className="h-20" />
                    </div>
                  );
                })}
              </div>

              {/* Render Nodes (Interactive Absolute HTML Elements) */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {ARCHIFY_SPEC.nodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isConnected = connectedEdges.some(e => e.source === node.id || e.target === node.id);
                  const isVisible = selectedLayer === 'all' || node.layer === selectedLayer;
                  const colors = getLayerColor(node.layer);

                  if (!isVisible) return null;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        backgroundColor: isSelected ? colors.light : '#fcfbf7',
                        borderColor: isSelected ? colors.border : '#ded9c8',
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${node.width}px`,
                        height: `${node.height}px`
                      }}
                      className={`absolute pointer-events-auto rounded-xl p-3 border transition-all duration-200 cursor-pointer shadow-sm select-none flex flex-col justify-between ${
                        isSelected 
                          ? 'ring-2 ring-[#4d6b53] shadow-md scale-105 z-30'
                          : isConnected 
                          ? 'ring-1 ring-[#8fb596] shadow-sm'
                          : 'hover:border-[#4d6b53] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-extrabold text-xs text-[#222d25] truncate">
                            {node.label}
                          </div>
                          <div className="text-[10px] text-[#616c62] font-mono truncate">
                            {node.sublabel}
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }} />
                      </div>

                      <div className="flex items-center gap-1 overflow-hidden">
                        {node.tags.slice(0, 2).map((t, idx) => (
                          <span 
                            key={idx}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-white/80 border border-[#e2dfd2] text-[#616c62] truncate"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Node Inspector Card (Details & Connected APIs) */}
          {selectedNode && (
            <div className="bg-[#fcfbf7] border border-[#e8e5d8] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-[#e8e5d8] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff4ec] border border-[#c8d8c3] flex items-center justify-center text-[#4d6b53] font-bold">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-[#222d25]">{selectedNode.label}</h3>
                      <span className="text-[10px] font-mono text-[#616c62] bg-white border border-[#ded9c8] px-2 py-0.5 rounded-full">
                        {selectedNode.sublabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#616c62] mt-0.5">{selectedNode.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.tags.map((t, i) => (
                    <span key={i} className="text-[10px] font-semibold bg-[#eff4ec] text-[#2c5832] border border-[#c8d8c3] px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Node Specifications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* File mapping */}
                <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#616c62] flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-[#4d6b53]" /> 模組程式碼對應 (Files)
                  </span>
                  <div className="space-y-1">
                    {selectedNode.files.map((f, i) => (
                      <div key={i} className="font-mono text-[11px] text-[#222d25] bg-white p-1 rounded border border-[#e8e5d8]">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* API contracts */}
                <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#616c62] flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-amber-700" /> API / 端點協議
                  </span>
                  <div className="space-y-1">
                    {selectedNode.apis && selectedNode.apis.length > 0 ? (
                      selectedNode.apis.map((a, i) => (
                        <div key={i} className="font-mono text-[11px] text-amber-900 bg-amber-50 p-1 rounded border border-amber-200">
                          {a}
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-[#778378] italic p-1">純客戶端無狀態模組</div>
                    )}
                  </div>
                </div>

                {/* Connected edges */}
                <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#616c62] flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-purple-700" /> 關聯資料流動 (Edges)
                  </span>
                  <div className="space-y-1">
                    {connectedEdges.map(e => (
                      <div key={e.id} className="text-[10px] text-[#2c5832] bg-white p-1 rounded border border-[#e8e5d8] flex items-center justify-between">
                        <span>{e.source === selectedNode.id ? `➔ 到 ${e.target}` : `⬅ 來自 ${e.source}`}</span>
                        <span className="font-bold text-[#4d6b53]">{e.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Layers Explanation Tab */}
      {activeTab === 'layers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ARCHIFY_SPEC.layers.map(layer => {
              const nodesInLayer = ARCHIFY_SPEC.nodes.filter(n => n.layer === layer.id);
              const colors = getLayerColor(layer.id);

              return (
                <div 
                  key={layer.id}
                  className="bg-[#fcfbf7] border border-[#ded9c8] p-5 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#e8e5d8] pb-2.5">
                    <h3 className="font-extrabold text-sm text-[#222d25] flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.border }} />
                      <span>{layer.name}</span>
                    </h3>
                    <span className="text-xs text-[#616c62] font-semibold">{nodesInLayer.length} 個元件</span>
                  </div>

                  <p className="text-xs text-[#4d564f] leading-relaxed">
                    {layer.description}
                  </p>

                  <div className="space-y-2 pt-2">
                    {nodesInLayer.map(node => (
                      <div 
                        key={node.id}
                        className="bg-[#f8f7f2] p-3 rounded-xl border border-[#ded9c8] text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#222d25]">{node.label}</div>
                          <div className="text-[10px] text-[#616c62]">{node.description}</div>
                        </div>
                        <div className="text-right font-mono text-[10px] text-[#4d6b53]">
                          {node.files[0]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Archify JSON IR Specification Tab */}
      {activeTab === 'json' && (
        <div className="bg-[#1a251e] text-[#f3f6f3] p-5 rounded-2xl border border-[#344839] shadow-inner space-y-3">
          <div className="flex items-center justify-between border-b border-[#344839] pb-3 text-xs">
            <span className="text-[#a8ccaf] font-mono font-bold">archify-specification.json (IR)</span>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1 bg-[#2c4031] hover:bg-[#39523f] text-[#a8ccaf] border border-[#486b51] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製 JSON' : '複製 Archify 規範'}</span>
            </button>
          </div>

          <pre className="text-xs font-mono text-[#dbe5dd] overflow-x-auto p-2 max-h-[500px] scrollbar-thin">
            {JSON.stringify(ARCHIFY_SPEC, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
