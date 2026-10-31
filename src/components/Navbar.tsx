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
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, entries }) => {
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
    <header className="sticky top-0 z-30 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 text-stone-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-stone-950">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-stone-100">
                  把日子過好
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  個人自我教練閉環系統
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                直覺條件反省 · 閉環知識庫 · AI 認知副處理器
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700/60">
              <span className="text-stone-400">已記錄天數:</span>
              <span className="font-semibold text-stone-200">{entries.length} 天</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
              <span className="text-emerald-400/80">好日子率:</span>
              <span className="font-bold">{goodRatio}%</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-stone-800/60">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent'
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
