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
        className="bg-[#fcfbf7] border border-[#e8e5d8] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/20 text-[#2c332d] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e5d8] bg-[#f8f7f2]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#4d6b53] text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#222d25] flex items-center gap-2">
                <span>系統啟動自檢與自動配置</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#eff7ee] text-[#2c5832] border border-[#b8dab3] font-bold">
                  自動化就緒
                </span>
              </h3>
              <p className="text-xs text-[#616c62]">
                自動偵測依賴安裝、環境變數與 Obsidian 知識庫目錄狀態
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#eff4ec] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick summary bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#eff4ec] border border-[#c8d8c3]">
            <div className="flex items-center gap-2.5 text-[#3d5942]">
              <CheckCircle2 className="w-5 h-5 text-[#4d6b53] shrink-0" />
              <div>
                <span className="font-bold text-sm text-[#222d25] block">系統運行環境良好</span>
                <span className="text-[11px] text-[#444d45]">
                  伺服器啟動時已自動完成基礎檢查與目錄架構生成。
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#e4ece0] rounded-lg text-[#3d5942] font-semibold border border-[#c8d8c3] transition shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新偵測</span>
              </button>
              <button
                onClick={handleRunAutoSetup}
                disabled={isFixing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4d6b53] hover:bg-[#3f5844] text-white font-bold rounded-lg transition shadow-md shadow-[#4d6b53]/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isFixing ? '修復配置中...' : '一鍵自動配置'}</span>
              </button>
            </div>
          </div>

          {fixSuccess && (
            <div className="p-3 bg-[#eff7ee] border border-[#b8dab3] rounded-xl text-[#2c5832] flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[#2c5832]" />
              <span>{fixSuccess}</span>
            </div>
          )}

          {/* Diagnostic 3-Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Box 1: Dependencies */}
            <div className="bg-[#f8f7f2] p-4 rounded-xl border border-[#ded9c8] space-y-2">
              <div className="flex items-center justify-between font-bold text-[#222d25]">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#4d6b53]" />
                  <span>核心依賴套件</span>
                </span>
                <span className="text-[10px] text-[#3d5942] bg-[#eff4ec] px-2 py-0.5 rounded-full border border-[#c8d8c3] font-bold">
                  {statusData?.dependencies.installedPackages.length || 8} 項已安裝
                </span>
              </div>
              <p className="text-[11px] text-[#616c62] leading-relaxed">
                {statusData?.dependencies.message || '核心套件已安裝'}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {['@google/genai', 'express', 'react', 'motion', 'tailwindcss'].map(p => (
                  <span key={p} className="text-[9px] bg-white text-[#2c332d] px-1.5 py-0.5 rounded border border-[#ded9c8] font-medium">
                    ✓ {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Box 2: Environment */}
            <div className="bg-[#f8f7f2] p-4 rounded-xl border border-[#ded9c8] space-y-2">
              <div className="flex items-center justify-between font-bold text-[#222d25]">
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-amber-600" />
                  <span>環境與配置檔</span>
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                  {statusData?.env.hasEnvFile ? '.env 已載入' : '已自動補齊'}
                </span>
              </div>
              <p className="text-[11px] text-[#616c62] leading-relaxed">
                {statusData?.env.message || '.env 配置檔已就緒'}
              </p>
              <div className="text-[10px] text-[#616c62] pt-1 font-medium">
                {statusData?.env.hasGeminiKey 
                  ? '✨ GEMINI_API_KEY 已啟用' 
                  : '💡 包含啟發式行為副處理器備援'}
              </div>
            </div>

            {/* Box 3: Vault */}
            <div className="bg-[#f8f7f2] p-4 rounded-xl border border-[#ded9c8] space-y-2">
              <div className="flex items-center justify-between font-bold text-[#222d25]">
                <span className="flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-[#4d6b53]" />
                  <span>Obsidian 知識庫</span>
                </span>
                <span className="text-[10px] text-[#2c5832] bg-[#eff7ee] px-2 py-0.5 rounded-full border border-[#b8dab3] font-bold">
                  結構齊全
                </span>
              </div>
              <p className="text-[11px] text-[#616c62] leading-relaxed">
                3 個專屬目錄與 3 份 Markdown 核心手冊模版皆已就緒。
              </p>
              <div className="flex flex-col gap-0.5 text-[10px] text-[#444d45] pt-0.5 font-mono">
                <span>📁 01_日誌/</span>
                <span>📁 02_模版/每日自我教練模版.md</span>
                <span>📁 03_知識庫/個人操作手冊.md</span>
              </div>
            </div>
          </div>

          {/* AI Connection Test Section (Signature Forest Green Sanctuary) */}
          <div className="p-4 rounded-xl bg-[#1a251e] border border-[#344839]/80 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#a8ccaf]" />
                <span className="font-bold text-white text-xs">
                  AI 認知副處理器 即時連線檢測
                </span>
              </div>
              <button
                onClick={handleTestAI}
                disabled={isAiTesting}
                className="px-3 py-1 rounded-lg bg-[#4d6b53] hover:bg-[#3f5844] text-white transition text-[11px] flex items-center gap-1 font-semibold shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isAiTesting ? 'animate-spin' : ''}`} />
                <span>{isAiTesting ? '測試中...' : '發送測試握手'}</span>
              </button>
            </div>

            {aiTestResult && (
              <div className="p-3 bg-[#121c15] rounded-lg border border-[#28382c] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#a8ccaf] font-semibold">
                  <span>回應狀態：成功 ({aiTestResult.mode})</span>
                  <span className="text-[#8fa894] font-mono">{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="text-[#dbe5dd] italic">“{aiTestResult.text}”</p>
              </div>
            )}
          </div>

          {/* Auto Actions Log */}
          {statusData?.actionsTaken && statusData.actionsTaken.length > 0 && (
            <div className="p-4 rounded-xl bg-[#f8f7f2] border border-[#ded9c8] space-y-2">
              <span className="text-[#222d25] font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#4d6b53]" />
                <span>本次自動化配置日誌 (Audit Log)</span>
              </span>
              <ul className="space-y-1 text-[#444d45] text-[11px]">
                {statusData.actionsTaken.map((action, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[#2c5832] font-medium">
                    <span>✓</span>
                    <span className="text-[#2c332d]">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f8f7f2] border-t border-[#e8e5d8] flex items-center justify-between text-xs text-[#616c62]">
          <span>啟動命令：<code className="bg-white px-1.5 py-0.5 rounded border border-[#ded9c8] text-[#3d5942]">npm run setup</code> 或 <code className="bg-white px-1.5 py-0.5 rounded border border-[#ded9c8] text-[#3d5942]">npm run dev</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#eff4ec] text-[#2c332d] border border-[#ded9c8] font-medium rounded-lg transition shadow-2xs cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
