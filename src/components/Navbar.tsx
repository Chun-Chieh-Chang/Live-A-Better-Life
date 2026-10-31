import React from 'react';
import { ActiveTab, DailyEntry } from '../types';
import { 
  Sparkles, 
  BookOpen, 
  BarChart3, 
  FolderDown, 
  ScrollText, 
  HeartHandshake
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  entries: DailyEntry[];
  onOpenSystemHealth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, entries, onOpenSystemHealth }) => {
  const goodCount = entries.filter(e => e.state === 'good').length;
  const goodRatio = entries.length > 0 ? Math.round((goodCount / entries.length) * 100) : 0;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'daily', label: '今日反省與實踐', icon: <HeartHandshake className="w-4 h-4" /> },
    { id: 'personalOS', label: '個人操作手冊 (中樞)', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'insights', label: '趨勢與生活洞察', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'obsidian', label: 'Obsidian 整合匯出', icon: <FolderDown className="w-4 h-4" /> },
    { id: 'transcript', label: '系統藍圖與逐字稿', icon: <ScrollText className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 text-slate-800 shadow-sm shadow-sky-900/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0084ff] to-[#0284c7] flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#09223b]">
                  把日子過好
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0070ba] border border-sky-200 font-semibold">
                  個人自我教練閉環系統
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                直覺條件反省 · 閉環知識庫 · AI 認知副處理器
              </p>
            </div>
          </div>

          {/* Quick Metrics & System Health Button */}
          <div className="flex items-center gap-2.5 text-xs">
            {onOpenSystemHealth && (
              <button
                type="button"
                onClick={onOpenSystemHealth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50/80 hover:bg-sky-100 border border-sky-300 text-[#0070ba] font-semibold transition cursor-pointer shadow-xs"
                title="點擊查看系統啟動自檢與自動配置狀態"
              >
                <span className="w-2 h-2 rounded-full bg-[#0084ff] animate-pulse" />
                <span>系統自檢: 健全</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-slate-600 shadow-xs">
                <span className="text-slate-400">已記錄:</span>
                <span className="font-bold text-[#09223b]">{entries.length} 天</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs font-medium">
                <span className="text-emerald-600/80">好日子率:</span>
                <span className="font-bold">{goodRatio}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-sky-50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#0084ff] text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-600 hover:text-[#0084ff] hover:bg-sky-50/80 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
