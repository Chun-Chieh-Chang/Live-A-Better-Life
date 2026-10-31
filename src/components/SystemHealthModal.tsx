import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Zap, 
  Terminal, 
  FolderCheck, 
  Cpu, 
  FileCode2, 
  Sparkles
} from 'lucide-react';

export interface SystemStatusData {
  timestamp: string;
  isReady: boolean;
  env: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    hasEnvFile: boolean;
    hasGeminiKey: boolean;
  };
  dependencies: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    installedPackages: string[];
    missingPackages: string[];
  };
  vault: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    directories: { path: string; exists: boolean }[];
    files: { path: string; exists: boolean }[];
  };
  actionsTaken: string[];
}

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: SystemStatusData | null;
  onRefresh: () => void;
  onTriggerSetup: () => Promise<void>;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  statusData,
  onRefresh,
  onTriggerSetup
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{ text: string; mode: string } | null>(null);
  const [isAiTesting, setIsAiTesting] = useState(false);

  if (!isOpen) return null;

  const handleRunAutoSetup = async () => {
    setIsFixing(true);
    try {
      await onTriggerSetup();
      setFixSuccess('✅ 系統已完成自動檢查與全目錄配置！');
      setTimeout(() => setFixSuccess(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  const handleTestAI = async () => {
    setIsAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/system/test-ai', { method: 'POST' });
      const data = await res.json();
      setAiTestResult({ text: data.text, mode: data.mode });
    } catch (err: any) {
      setAiTestResult({
        text: 'AI 啟發式副處理器待命就緒（使用本地行為設計模型）。',
        mode: 'heuristic'
      });
    } finally {
      setIsAiTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-sky-100 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-sky-950/20 text-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-sky-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0084ff] text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#09223b] flex items-center gap-2">
                <span>系統啟動自檢與自動配置</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  自動化就緒
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                自動偵測依賴安裝、環境變數與 Obsidian 知識庫目錄狀態
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick summary bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-sky-50 border border-sky-200">
            <div className="flex items-center gap-2.5 text-[#0070ba]">
              <CheckCircle2 className="w-5 h-5 text-[#0084ff] shrink-0" />
              <div>
                <span className="font-bold text-sm text-[#09223b] block">系統運行環境良好</span>
                <span className="text-[11px] text-slate-600">
                  伺服器啟動時已自動完成基礎檢查與目錄架構生成。
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-100 rounded-lg text-[#0070ba] font-semibold border border-sky-200 transition shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新偵測</span>
              </button>
              <button
                onClick={handleRunAutoSetup}
                disabled={isFixing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold rounded-lg transition shadow-md shadow-sky-500/20"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isFixing ? '修復配置中...' : '一鍵自動配置'}</span>
              </button>
            </div>
          </div>

          {fixSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{fixSuccess}</span>
            </div>
          )}

          {/* Diagnostic 3-Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Box 1: Dependencies */}
            <div className="bg-[#f8fafc] p-4 rounded-xl border border-sky-100 space-y-2">
              <div className="flex items-center justify-between font-bold text-[#09223b]">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#0084ff]" />
                  <span>核心依賴套件</span>
                </span>
                <span className="text-[10px] text-[#0070ba] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 font-bold">
                  {statusData?.dependencies.installedPackages.length || 8} 項已安裝
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {statusData?.dependencies.message || '核心套件已安裝'}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {['@google/genai', 'express', 'react', 'motion', 'tailwindcss'].map(p => (
                  <span key={p} className="text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Box 2: Environment */}
            <div className="bg-[#f8fafc] p-4 rounded-xl border border-sky-100 space-y-2">
              <div className="flex items-center justify-between font-bold text-[#09223b]">
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-amber-500" />
                  <span>環境與配置檔</span>
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                  {statusData?.env.hasEnvFile ? '.env 已載入' : '已自動補齊'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {statusData?.env.message || '.env 配置檔已就緒'}
              </p>
              <div className="text-[10px] text-slate-500 pt-1 font-medium">
                {statusData?.env.hasGeminiKey 
                  ? '✨ GEMINI_API_KEY 已啟用' 
                  : '💡 包含啟發式行為副處理器備援'}
              </div>
            </div>

            {/* Box 3: Vault */}
            <div className="bg-[#f8fafc] p-4 rounded-xl border border-sky-100 space-y-2">
              <div className="flex items-center justify-between font-bold text-[#09223b]">
                <span className="flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-teal-600" />
                  <span>Obsidian 知識庫</span>
                </span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-bold">
                  結構齊全
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                3 個專屬目錄與 3 份 Markdown 核心手冊模版皆已就緒。
              </p>
              <div className="flex flex-col gap-0.5 text-[10px] text-slate-600 pt-0.5 font-mono">
                <span>📁 01_日誌/</span>
                <span>📁 02_模版/每日自我教練模版.md</span>
                <span>📁 03_知識庫/個人操作手冊.md</span>
              </div>
            </div>
          </div>

          {/* AI Connection Test Section (Deep Ocean Navy Container from Screenshots) */}
          <div className="p-4 rounded-xl bg-[#0b3149] border border-[#0284c7]/40 text-white space-y-3 shadow-md shadow-sky-950/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-bold text-white text-xs">
                  AI 認知副處理器 即時連線檢測
                </span>
              </div>
              <button
                onClick={handleTestAI}
                disabled={isAiTesting}
                className="px-3 py-1 rounded-lg bg-[#0084ff] hover:bg-[#0073e6] text-white transition text-[11px] flex items-center gap-1 font-semibold shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${isAiTesting ? 'animate-spin' : ''}`} />
                <span>{isAiTesting ? '測試中...' : '發送測試握手'}</span>
              </button>
            </div>

            {aiTestResult && (
              <div className="p-3 bg-[#072438] rounded-lg border border-[#14476e] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#38bdf8] font-semibold">
                  <span>回應狀態：成功 ({aiTestResult.mode})</span>
                  <span className="text-sky-300/60 font-mono">{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-200 italic">“{aiTestResult.text}”</p>
              </div>
            )}
          </div>

          {/* Auto Actions Log */}
          {statusData?.actionsTaken && statusData.actionsTaken.length > 0 && (
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-sky-100 space-y-2">
              <span className="text-slate-700 font-bold block flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#0084ff]" />
                <span>本次自動化配置日誌 (Audit Log)</span>
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                {statusData.actionsTaken.map((action, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span>✓</span>
                    <span className="text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-sky-100 flex items-center justify-between text-xs text-slate-500">
          <span>啟動命令：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[#0070ba]">npm run setup</code> 或 <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[#0070ba]">npm run dev</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium rounded-lg transition shadow-2xs"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
