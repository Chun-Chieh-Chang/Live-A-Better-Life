import React, { useState } from 'react';
import { FULL_TRANSCRIPT_MARKDOWN, AI_AGENT_BLUEPRINT_MARKDOWN } from '../data/initialData';
import { downloadFile } from '../utils/markdownExporter';
import { 
  ScrollText, 
  Terminal, 
  Copy, 
  Download, 
  Check, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Bot
} from 'lucide-react';

export const TranscriptBlueprintTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'blueprint' | 'transcript'>('blueprint');
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleCopyBlueprint = () => {
    navigator.clipboard.writeText(AI_AGENT_BLUEPRINT_MARKDOWN);
    setCopiedBlueprint(true);
    setTimeout(() => setCopiedBlueprint(false), 2000);
  };

  const handleDownloadBlueprint = () => {
    downloadFile('給AI_Agent的系統架設指令.md', AI_AGENT_BLUEPRINT_MARKDOWN);
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(FULL_TRANSCRIPT_MARKDOWN);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleDownloadTranscript = () => {
    downloadFile('把日子過好_完整對話逐字稿.md', FULL_TRANSCRIPT_MARKDOWN);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-5 rounded-2xl border border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-stone-100">
              系統架設藍圖與完整對話逐字稿
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
            此處收錄了我們討論「如何把日子過好」的完整思考演進過程，以及經由嚴格審查後、
            為 AI IDE (Trae, Cline, Cursor, Qoder 等) 量身定制的高精度系統初始化指令。
          </p>
        </div>

        {/* Section toggles */}
        <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
          <button
            onClick={() => setActiveSection('blueprint')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'blueprint'
                ? 'bg-emerald-600 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>🤖 給 AI IDE 的架設藍圖</span>
          </button>
          <button
            onClick={() => setActiveSection('transcript')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'transcript'
                ? 'bg-emerald-600 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>📜 完整對話逐字稿 (.md)</span>
          </button>
        </div>
      </div>

      {/* Blueprint Section */}
      {activeSection === 'blueprint' && (
        <div className="space-y-4">
          {/* Consistency check banner */}
          <div className="bg-emerald-950/30 border border-emerald-900/60 p-4 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>審查結論：與逐字稿邏輯 100% 吻合並全面升級</span>
            </div>
            <p className="text-stone-300 leading-relaxed">
              本架設指令嚴格遵循您所提議的「我今天過得好嗎？好 / 不好 / 普通」條件式分支，
              整合了「客觀事實與主觀情緒剝離」、「微小瞬間放大」、Obsidian 區塊引用自動投影防禦，
              並特別將「AI 認知副處理器行為準則」存為專屬檔案，讓任何 AI Agent 讀取該資料夾後，
              皆能瞬間轉換為極低阻力、If-Then 格式的個人專屬教練。
            </p>
          </div>

          <div className="bg-stone-900/80 rounded-2xl border border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-stone-100 text-sm">
                  給 AI IDE / Agent 的一鍵提示詞 (複製後直接貼給 Trae / Cline / Cursor)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBlueprint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition cursor-pointer shadow-md"
                >
                  {copiedBlueprint ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBlueprint ? '已複製全部指令！' : '一鍵複製整份指令'}</span>
                </button>
                <button
                  onClick={handleDownloadBlueprint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下載 .md</span>
                </button>
              </div>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto selection:bg-emerald-900/50">
              {AI_AGENT_BLUEPRINT_MARKDOWN}
            </div>
          </div>
        </div>
      )}

      {/* Transcript Section */}
      {activeSection === 'transcript' && (
        <div className="bg-stone-900/80 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-stone-100 text-sm">
                完整對話逐字稿 (純 Markdown 格式)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition cursor-pointer shadow-md"
              >
                {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTranscript ? '已複製逐字稿！' : '一鍵複製逐字稿 MD'}</span>
              </button>
              <button
                onClick={handleDownloadTranscript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下載 .md</span>
              </button>
            </div>
          </div>

          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto selection:bg-emerald-900/50">
            {FULL_TRANSCRIPT_MARKDOWN}
          </div>
        </div>
      )}
    </div>
  );
};
