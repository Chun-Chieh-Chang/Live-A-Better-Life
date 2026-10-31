import React, { useState } from 'react';
import { DailyEntry, PersonalOS } from '../types';
import { 
  generateDailyNoteMarkdown, 
  generateTemplateMarkdown, 
  generatePersonalOSMarkdown, 
  downloadFile 
} from '../utils/markdownExporter';
import { 
  FolderTree, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Folder, 
  Database, 
  Upload, 
  Sparkles,
  Info
} from 'lucide-react';

interface ObsidianExportTabProps {
  entries: DailyEntry[];
  personalOS: PersonalOS;
  onImportData: (entries: DailyEntry[], personalOS: PersonalOS) => void;
}

export const ObsidianExportTab: React.FC<ObsidianExportTabProps> = ({
  entries,
  personalOS,
  onImportData
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('02_模版/每日自我教練模版.md');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Compute file content based on selection
  const getFileContent = (path: string): string => {
    if (path === '02_模版/每日自我教練模版.md') {
      return generateTemplateMarkdown();
    }
    if (path === '03_知識庫/個人操作手冊.md') {
      return generatePersonalOSMarkdown(personalOS);
    }
    if (path === '03_知識庫/AI教練行為準則.md') {
      return `# 🤖 AI 認知副處理器 行為準則 (System Prompt)

當使用者在對話框輸入「幫我完成今日復盤」、「幫我找解法」或呼叫 \`/coach\` 時，AI Agent 必須嚴格執行以下 SOP：

1. **讀取上下文：** 
   - 讀取 \`01_日誌\` 中最新的一篇（或使用者指定日期）的檔案。
   - 讀取 \`03_知識庫/個人操作手冊.md\` 的歷史經驗與避坑指南。
2. **定位問題點：** 
   - 找出日記中標記為 \`[ ] 待 AI 教練建議...\` 的區塊。
   - 綜合分析使用者今天填寫的「客觀事實」、「情緒」、「原因」或「微小瞬間」。
3. **生成策略原則（極度重要）：**
   - **化繁為簡：** 絕不提供宏大、耗費意志力的計畫（如：每天運動一小時）。只提供極低啟動門檻的「行為設計」（如：把運動鞋放在門口）。
   - **If-Then 格式：** 改善策略需盡量採用「If [具體觸發情境], Then [微小且具體的行動]」句型。
   - **同理與客觀：** 運用阿德勒「課題分離」視角，溫和地接納使用者的不完美，將挫折視為優化系統的數據。
4. **輸出與執行：**
   - 直接輸出 2~3 個具體的 Markdown 列表建議。
   - 若使用者有授權 IDE 自動寫入權限，請直接將建議覆蓋掉日記檔案中的 \`[ ] 待 AI 教練建議...\` 標籤。
`;
    }
    if (path.startsWith('01_日誌/')) {
      const date = path.replace('01_日誌/', '').replace('.md', '');
      const entry = entries.find(e => e.date === date);
      if (entry) {
        return generateDailyNoteMarkdown(entry, personalOS);
      }
    }
    return '';
  };

  const currentContent = getFileContent(selectedFile);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const filename = selectedFile.split('/').pop() || 'note.md';
    downloadFile(filename, currentContent);
  };

  // Download all daily notes sequentially
  const handleDownloadAllNotes = () => {
    // Download Personal OS
    downloadFile('個人操作手冊.md', generatePersonalOSMarkdown(personalOS));
    // Download Template
    setTimeout(() => {
      downloadFile('每日自我教練模版.md', generateTemplateMarkdown());
    }, 300);
    // Download Entries
    entries.forEach((e, idx) => {
      setTimeout(() => {
        downloadFile(`${e.date}.md`, generateDailyNoteMarkdown(e, personalOS));
      }, 600 + idx * 300);
    });
  };

  // Backup JSON
  const handleExportJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries,
      personalOS
    };
    downloadFile(`life-os-backup-${new Date().toISOString().split('T')[0]}.json`, JSON.stringify(backup, null, 2), 'application/json');
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.entries && json.personalOS) {
          onImportData(json.entries, json.personalOS);
          setImportStatus('✅ 備份資料已成功匯入！');
        } else {
          setImportStatus('❌ 檔案格式不符合規範');
        }
      } catch (err) {
        setImportStatus('❌ JSON 解析失敗');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-5 rounded-2xl border border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-stone-100">
              Obsidian 知識庫無縫整合
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
            系統中所有的反省、策略與配方，皆百分之百遵循 Obsidian 標準 Markdown 格式（含區塊引用 
            <code className="text-purple-300"> ![[ ]]</code>、雙向連結 
            <code className="text-purple-300"> [[ ]]</code>、Callout 區塊）。
            你可以隨時匯出至電腦的 Obsidian Vault。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAllNotes}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>批次下載全庫 Markdown</span>
          </button>
        </div>
      </div>

      {/* Main File Explorer & Markdown Previewer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Folder Tree */}
        <div className="bg-stone-900/80 rounded-2xl border border-stone-800 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4 text-stone-400" />
            <span>Obsidian Vault 檔案結構</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* 01_日誌 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-medium py-1">
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>📂 01_日誌 ({entries.length})</span>
              </div>
              <div className="pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                {entries.map(e => {
                  const path = `01_日誌/${e.date}.md`;
                  const isSelected = selectedFile === path;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedFile(path)}
                      className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded transition ${
                        isSelected 
                          ? 'bg-purple-950/80 text-purple-300 font-semibold' 
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-stone-500" />
                      <span>{e.date}.md</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 02_模版 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-medium py-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>📂 02_模版</span>
              </div>
              <div className="pl-4">
                <button
                  onClick={() => setSelectedFile('02_模版/每日自我教練模版.md')}
                  className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded transition ${
                    selectedFile === '02_模版/每日自我教練模版.md'
                      ? 'bg-purple-950/80 text-purple-300 font-semibold' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <FileText className="w-3 h-3 text-amber-500/80" />
                  <span>每日自我教練模版.md</span>
                </button>
              </div>
            </div>

            {/* 03_知識庫 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 font-medium py-1">
                <Folder className="w-3.5 h-3.5 text-teal-400" />
                <span>📂 03_知識庫</span>
              </div>
              <div className="pl-4 space-y-0.5">
                <button
                  onClick={() => setSelectedFile('03_知識庫/個人操作手冊.md')}
                  className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded transition ${
                    selectedFile === '03_知識庫/個人操作手冊.md'
                      ? 'bg-purple-950/80 text-purple-300 font-semibold' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <FileText className="w-3 h-3 text-teal-500/80" />
                  <span>個人操作手冊.md</span>
                </button>
                <button
                  onClick={() => setSelectedFile('03_知識庫/AI教練行為準則.md')}
                  className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded transition ${
                    selectedFile === '03_知識庫/AI教練行為準則.md'
                      ? 'bg-purple-950/80 text-purple-300 font-semibold' 
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                  }`}
                >
                  <FileText className="w-3 h-3 text-teal-500/80" />
                  <span>AI教練行為準則.md</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Restore Box */}
          <div className="pt-4 border-t border-stone-800 space-y-2">
            <span className="text-[11px] font-semibold text-stone-400 block">
              資料備份與還原 (JSON)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-300 border border-stone-700 transition"
              >
                <Database className="w-3 h-3 text-emerald-400" />
                <span>匯出備份</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-300 border border-stone-700 cursor-pointer transition">
                <Upload className="w-3 h-3 text-amber-400" />
                <span>匯入備份</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <p className="text-[11px] text-stone-300 bg-stone-950 p-2 rounded border border-stone-800">
                {importStatus}
              </p>
            )}
          </div>
        </div>

        {/* Right: Markdown Content Preview */}
        <div className="md:col-span-2 bg-stone-900/80 rounded-2xl border border-stone-800 p-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-xs font-semibold text-stone-200">
                {selectedFile}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs border border-stone-700 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已複製' : '複製內容'}</span>
              </button>
              <button
                onClick={handleDownloadSingle}
                className="flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs border border-stone-700 transition"
              >
                <Download className="w-3 h-3" />
                <span>下載檔案</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 min-h-[380px] bg-stone-950 p-4 rounded-xl border border-stone-800/80 font-mono text-xs text-stone-300 leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-purple-900/50">
            {currentContent}
          </div>

          <div className="flex items-center gap-2 text-stone-500 text-[11px] pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              提示：將上述檔案直接複製貼到 Obsidian 的對應資料夾內，即可完美保有雙向連結與呼叫指令。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
