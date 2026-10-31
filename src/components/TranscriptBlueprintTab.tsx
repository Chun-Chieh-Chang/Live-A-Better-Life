import React, { useState } from 'react';
import { FULL_TRANSCRIPT_MARKDOWN, AI_AGENT_BLUEPRINT_MARKDOWN, README_MARKDOWN } from '../data/initialData';
import { downloadFile } from '../utils/markdownExporter';
import { 
  ScrollText, 
  Terminal, 
  Copy, 
  Download, 
  Check, 
  CheckCircle2, 
  Bot,
  BookOpenCheck
} from 'lucide-react';

export const TranscriptBlueprintTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'blueprint' | 'readme' | 'transcript'>('blueprint');
  const [copiedBlueprint, setCopiedBlueprint] = useState(false);
  const [copiedReadme, setCopiedReadme] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleCopyBlueprint = () => {
    navigator.clipboard.writeText(AI_AGENT_BLUEPRINT_MARKDOWN);
    setCopiedBlueprint(true);
    setTimeout(() => setCopiedBlueprint(false), 2000);
  };

  const handleDownloadBlueprint = () => {
    downloadFile('給AI_Agent的系統架設指令.md', AI_AGENT_BLUEPRINT_MARKDOWN);
  };

  const handleCopyReadme = () => {
    navigator.clipboard.writeText(README_MARKDOWN);
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 2000);
  };

  const handleDownloadReadme = () => {
    downloadFile('README.md', README_MARKDOWN);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm shadow-sky-900/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-50 text-[#0084ff]">
              <ScrollText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#09223b]">
              系統架設藍圖、README 與對話逐字稿
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            此處收錄了本系統的完整規格架構、給 AI IDE 的初始化指令、專案 README 檔案，以及思考演進的對話逐字稿。
          </p>
        </div>

        {/* Section toggles */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#f8fafc] p-1.5 rounded-2xl border border-sky-200">
          <button
            onClick={() => setActiveSection('blueprint')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'blueprint'
                ? 'bg-[#0084ff] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0084ff]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>🤖 AI IDE 藍圖</span>
          </button>
          <button
            onClick={() => setActiveSection('readme')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'readme'
                ? 'bg-[#0084ff] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0084ff]'
            }`}
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>📖 README.md</span>
          </button>
          <button
            onClick={() => setActiveSection('transcript')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'transcript'
                ? 'bg-[#0084ff] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0084ff]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>📜 逐字稿 (.md)</span>
          </button>
        </div>
      </div>

      {/* Blueprint Section */}
      {activeSection === 'blueprint' && (
        <div className="space-y-4">
          {/* Consistency check banner */}
          <div className="bg-sky-50/80 border border-sky-200 p-5 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#0070ba] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#0084ff]" />
              <span>審查結論：與逐字稿邏輯 100% 吻合並全面升級</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              本架設指令嚴格遵循您所提議的「我今天過得好嗎？好 / 不好 / 普通」條件式分支，
              整合了「客觀事實與主觀情緒剝離」、「微小瞬間放大」、Obsidian 區塊引用自動投影防禦，
              並特別將「AI 認知副處理器行為準則」存為專屬檔案，讓任何 AI Agent 讀取該資料夾後，
              皆能瞬間轉換為極低阻力、If-Then 格式的個人專屬教練。
            </p>
          </div>

          <div className="bg-[#0b3149] rounded-2xl border border-[#0284c7]/40 p-6 space-y-4 shadow-xl shadow-sky-950/20 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#0d3b5b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <Terminal className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-bold text-white text-sm">
                  給 AI IDE / Agent 的一鍵提示詞 (複製後直接貼給 Trae / Cline / Cursor)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBlueprint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  {copiedBlueprint ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBlueprint ? '已複製全部指令！' : '一鍵複製整份指令'}</span>
                </button>
                <button
                  onClick={handleDownloadBlueprint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#072438] hover:bg-[#0a314d] text-[#7dd3fc] text-xs border border-[#0284c7]/50 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下載 .md</span>
                </button>
              </div>
            </div>

            <div className="bg-[#072236] p-4 rounded-xl border border-[#0d3d5f] font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto selection:bg-[#0084ff]/40">
              {AI_AGENT_BLUEPRINT_MARKDOWN}
            </div>
          </div>
        </div>
      )}

      {/* README.md Section */}
      {activeSection === 'readme' && (
        <div className="bg-[#0b3149] rounded-2xl border border-[#0284c7]/40 p-6 space-y-4 shadow-xl shadow-sky-950/20 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#0d3b5b] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <BookOpenCheck className="w-4 h-4 text-[#38bdf8]" />
              <div>
                <span className="font-bold text-white text-sm block">
                  專案 README.md (架構說明、Obsidian 配置與雲端部署)
                </span>
                <span className="text-[10px] text-[#7dd3fc]">
                  已同步提交至 Git 並部屬至 Cloud Run 雲端服務
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReadme}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                {copiedReadme ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReadme ? '已複製 README！' : '一鍵複製 README MD'}</span>
              </button>
              <button
                onClick={handleDownloadReadme}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#072438] hover:bg-[#0a314d] text-[#7dd3fc] text-xs border border-[#0284c7]/50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下載 README.md</span>
              </button>
            </div>
          </div>

          <div className="bg-[#072236] p-4 rounded-xl border border-[#0d3d5f] font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto selection:bg-[#0084ff]/40">
            {README_MARKDOWN}
          </div>
        </div>
      )}

      {/* Transcript Section */}
      {activeSection === 'transcript' && (
        <div className="bg-[#0b3149] rounded-2xl border border-[#0284c7]/40 p-6 space-y-4 shadow-xl shadow-sky-950/20 text-white">
          <div className="flex items-center justify-between border-b border-[#0d3b5b] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <ScrollText className="w-4 h-4 text-[#38bdf8]" />
              <span className="font-bold text-white text-sm">
                完整對話逐字稿 (純 Markdown 格式)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                {copiedTranscript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTranscript ? '已複製逐字稿！' : '一鍵複製逐字稿 MD'}</span>
              </button>
              <button
                onClick={handleDownloadTranscript}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#072438] hover:bg-[#0a314d] text-[#7dd3fc] text-xs border border-[#0284c7]/50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下載 .md</span>
              </button>
            </div>
          </div>

          <div className="bg-[#072236] p-4 rounded-xl border border-[#0d3d5f] font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto selection:bg-[#0084ff]/40">
            {FULL_TRANSCRIPT_MARKDOWN}
          </div>
        </div>
      )}
    </div>
  );
};
