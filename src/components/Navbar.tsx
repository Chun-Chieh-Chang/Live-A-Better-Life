import React, { useState } from "react";
import type { ActiveTab, DailyEntry } from "../types";

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
        <div className="flex justify-between items-center gap-4 py-4">
          <div>
            <p className="font-bold text-lg">把日子過好</p>
            <p className="text-sm text-[#717a72]">每天留一點時間給自己。</p>
          </div>
          <span className="text-sm text-[#717a72] shrink-0">
            已記錄 {entries.length} 天
          </span>
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
            className={`grid grid-cols-1 ${
              isDesktop && onOpenShutdown ? "sm:grid-cols-4" : "sm:grid-cols-3"
            } gap-2 border-t border-[#e8e5d8] py-3 text-sm`}
          >
            <button
              className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
              onClick={() => choose("zen3d")}
            >
              放鬆一下
            </button>
            <button
              className="min-h-11 rounded-xl hover:bg-[#eff4ec]"
              onClick={() => choose("architecture")}
            >
              使用說明
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
            {isDesktop && onOpenShutdown && (
              <button
                className="min-h-11 rounded-xl text-red-700 hover:bg-red-50 font-medium"
                onClick={() => {
                  setMore(false);
                  onOpenShutdown();
                }}
              >
                關閉系統與背景服務
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
