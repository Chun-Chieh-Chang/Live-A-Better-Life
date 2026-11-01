import React, { useState } from "react";
import type { ActiveTab, DailyEntry } from "../types";
import { Power } from "lucide-react";

interface NavbarProps {
  systemReady?: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  entries: DailyEntry[];
  onOpenSystemHealth?: () => void;
  isDesktop?: boolean;
  onOpenShutdown?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  entries,
  onOpenSystemHealth,
  isDesktop,
  onOpenShutdown,
}) => {
  const [more, setMore] = useState(false);
  const primary: [ActiveTab, string][] = [
    ["daily", "今天"],
    ["personalOS", "我的小改變"],
    ["insights", "生活回顧"],
    ["obsidian", "備份"],
  ];
  const choose = (tab: ActiveTab) => {
    onTabChange(tab);
    setMore(false);
  };
  return (
    <header className="sm:sticky top-0 z-30 bg-[#fefcf5]/95 backdrop-blur-md border-b border-[#e8e5d8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center gap-3 py-3 sm:py-4">
          <div>
            <p className="font-bold text-lg text-[#111827]">把日子過好</p>
            <p className="text-xs sm:text-sm text-[#717a72]">每天留一點時間給自己。</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className={`text-xs sm:text-sm text-[#717a72] ${
                isDesktop && onOpenShutdown ? "hidden sm:inline" : "inline"
              }`}
            >
              已記錄 {entries.length} 天
            </span>
            {isDesktop && onOpenShutdown && (
              <button
                type="button"
                onClick={onOpenShutdown}
                className="min-h-11 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 active:scale-95 border border-red-200/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                title="安全關閉背景伺服器與相關依賴"
              >
                <Power className="w-4 h-4 shrink-0 text-red-600" />
                <span>關閉系統與背景服務</span>
              </button>
            )}
          </div>
        </div>
        <nav
          aria-label="主要功能"
          className="grid grid-cols-[1fr_1.4fr_1.4fr_1fr_0.8fr] gap-1 pb-3 text-sm"
        >
          {primary.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => choose(id)}
              className="min-h-11 whitespace-nowrap px-1 sm:px-4 py-2 rounded-xl font-medium hover:bg-[#eff4ec] aria-[current=page]:bg-[#4d6b53] aria-[current=page]:text-white"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={more}
            aria-controls="more-navigation"
            onClick={() => setMore(!more)}
            className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
          >
            更多
          </button>
        </nav>
        {more && (
          <div
            id="more-navigation"
            className="grid grid-cols-3 gap-2 border-t border-[#e8e5d8] py-3 text-sm"
          >
            <button
              className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
              onClick={() => choose("architecture")}
            >
              使用說明
            </button>
            <button
              className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
              onClick={() => choose("knowledge-graph")}
            >
              系統全景圖
            </button>
            <button
              className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
              onClick={() => {
                setMore(false);
                onOpenSystemHealth?.();
              }}
            >
              使用狀態
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
