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
    <header className="sticky top-0 z-30 bg-[#fefcf5]/95 backdrop-blur-md border-b border-[#e8e5d8] text-[#2c332d] shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4d6b53] to-[#39523f] flex items-center justify-center shadow-md shadow-[#4d6b53]/20 text-white">
              <Sparkles className="w-5 h-5 fill-current text-[#eaf2e8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#232724]">
                  把日子過好
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#eff4ec] text-[#365239] border border-[#cadac6] font-semibold">
                  個人自我教練閉環系統
                </span>
              </div>
              <p className="text-xs text-[#717a72] hidden sm:block">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff4ec] hover:bg-[#e2ebd9] border border-[#cadac6] text-[#365239] font-semibold transition cursor-pointer shadow-xs"
                title="點擊查看系統啟動自檢與自動配置狀態"
              >
                <span className="w-2 h-2 rounded-full bg-[#4d6b53] animate-pulse" />
                <span>系統自檢: 健全</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e2dfd2] text-[#555e56] shadow-2xs">
                <span className="text-[#889189]">已記錄:</span>
                <span className="font-bold text-[#232724]">{entries.length} 天</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edf4ea] border border-[#bcd3b6] text-[#2e4c30] shadow-2xs font-medium">
                <span className="text-[#517554]">好日子率:</span>
                <span className="font-bold">{goodRatio}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-[#f0ede1]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4d6b53] text-white shadow-md shadow-[#4d6b53]/25'
                    : 'text-[#5c655d] hover:text-[#365239] hover:bg-[#f0f4ee] border border-transparent'
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
