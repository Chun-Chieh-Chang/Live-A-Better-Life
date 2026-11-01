import React, { useState } from "react";
import { ExternalLink, RefreshCw, Network } from "lucide-react";

export function KnowledgeGraphTab() {
  const [iframeKey, setIframeKey] = useState(0);

  return (
    <section className="space-y-4 pb-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4d6b53]/10 text-[#4d6b53] flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
              系統全景知識圖譜
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#717a72] mt-1">
            完整呈現本系統的認知心理模型、前端使用者體驗、後端服務、本機儲存與 Windows 原生運維流程。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="min-h-11 px-3 py-2 text-xs font-medium bg-white hover:bg-gray-50 border border-[#e8e5d8] rounded-xl text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="重新整理圖譜"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新整理</span>
          </button>
          <a
            href="./knowledge-graph.html"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 px-4 py-2 text-xs font-medium bg-[#4d6b53] hover:bg-[#3f5744] text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>在新分頁全螢幕開啟</span>
          </a>
        </div>
      </div>

      <div className="w-full h-[calc(100vh-215px)] min-h-[560px] bg-white rounded-2xl border border-[#e8e5d8] shadow-xs overflow-hidden">
        <iframe
          key={iframeKey}
          src="./knowledge-graph.html"
          title="Live-A-Better-Life 知識圖譜"
          className="w-full h-full border-0 block"
        />
      </div>
    </section>
  );
}
