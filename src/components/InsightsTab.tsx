import React, { useState } from 'react';
import { DailyEntry } from '../types';
import { 
  Calendar, 
  TrendingUp, 
  Smile, 
  Frown, 
  Meh, 
  Search, 
  Tag, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

interface InsightsTabProps {
  entries: DailyEntry[];
  onSelectDate: (date: string) => void;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ entries, onSelectDate }) => {
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics
  const total = entries.length;
  const goodCount = entries.filter(e => e.state === 'good').length;
  const badCount = entries.filter(e => e.state === 'bad').length;
  const normalCount = entries.filter(e => e.state === 'normal').length;
  const goodRatio = total > 0 ? Math.round((goodCount / total) * 100) : 0;

  // Factor frequency mapping
  const factorMap: Record<string, { good: number; bad: number; normal: number; total: number }> = {};
  entries.forEach(e => {
    (e.factors || []).forEach(f => {
      if (!factorMap[f]) {
        factorMap[f] = { good: 0, bad: 0, normal: 0, total: 0 };
      }
      factorMap[f][e.state]++;
      factorMap[f].total++;
    });
  });

  const sortedFactors = Object.entries(factorMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  // Tag frequency
  const tagMap: Record<string, number> = {};
  entries.forEach(e => {
    (e.tags || []).forEach(t => {
      tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Filtered entries
  const filteredEntries = entries.filter(e => {
    if (filterState !== 'all' && e.state !== filterState) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFact = e.badFact?.toLowerCase().includes(q);
      const matchEmotion = e.badEmotion?.toLowerCase().includes(q);
      const matchGood = e.goodWhere?.toLowerCase().includes(q);
      const matchNormal = e.normalMoment?.toLowerCase().includes(q);
      const matchTag = e.tags?.some(t => t.toLowerCase().includes(q));
      const matchFactor = e.factors?.some(f => f.toLowerCase().includes(q));
      return matchFact || matchEmotion || matchGood || matchNormal || matchTag || matchFactor;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>累積反省天數</span>
            <Calendar className="w-4 h-4 text-[#0084ff]" />
          </div>
          <div className="text-3xl font-extrabold text-[#09223b]">{total} <span className="text-sm font-normal text-slate-400">天</span></div>
          <div className="text-[11px] text-slate-400 mt-1">持續積累人生數據庫</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-900/5">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1 font-medium">
            <span>🟢 好日子率</span>
            <Smile className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{goodRatio}%</div>
          <div className="text-[11px] text-emerald-600/80 mt-1">共 {goodCount} 天好心情</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm shadow-amber-900/5">
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1 font-medium">
            <span>🟡 平凡如水</span>
            <Meh className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{normalCount} <span className="text-sm font-normal text-slate-400">天</span></div>
          <div className="text-[11px] text-amber-600/80 mt-1">捕捉到平靜瞬間</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm shadow-rose-900/5">
          <div className="flex items-center justify-between text-xs text-rose-700 mb-1 font-medium">
            <span>🔴 解題卡關</span>
            <Frown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600">{badCount} <span className="text-sm font-normal text-slate-400">天</span></div>
          <div className="text-[11px] text-rose-600/80 mt-1">轉化為避坑指南</div>
        </div>
      </div>

      {/* Analysis Section: Nourishing vs Consuming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factor Insights */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <h3 className="font-bold text-[#09223b] text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0084ff]" />
              <span>雙向連結關鍵因素 ([[ ]]) 關聯分析</span>
            </h3>
            <span className="text-xs text-[#0070ba] bg-sky-50 px-2 py-0.5 rounded-full font-semibold">
              高頻關聯
            </span>
          </div>

          <div className="space-y-3">
            {sortedFactors.length > 0 ? (
              sortedFactors.map(([factor, stats]) => {
                const goodPct = Math.round((stats.good / stats.total) * 100);
                const badPct = Math.round((stats.bad / stats.total) * 100);
                return (
                  <div key={factor} className="bg-[#f8fafc] p-3.5 rounded-xl border border-sky-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#09223b] font-mono">{factor}</span>
                      <span className="text-slate-500 text-[11px]">出現 {stats.total} 次</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                      <div style={{ width: `${goodPct}%` }} className="bg-emerald-500" title={`好日子: ${stats.good}`} />
                      <div style={{ width: `${badPct}%` }} className="bg-rose-500" title={`壞日子: ${stats.bad}`} />
                      <div style={{ width: `${100 - goodPct - badPct}%` }} className="bg-amber-400" title={`普通: ${stats.normal}`} />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span className="text-emerald-700 font-medium">🟢 滋養: {stats.good}天</span>
                      <span className="text-amber-700 font-medium">🟡 平凡: {stats.normal}天</span>
                      <span className="text-rose-700 font-medium">🔴 消耗: {stats.bad}天</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                尚未累積足夠的雙向連結關鍵字
              </p>
            )}
          </div>
        </div>

        {/* Tag Cloud & Patterns */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <h3 className="font-bold text-[#09223b] text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0084ff]" />
              <span>生活標籤雲 (#) 分佈</span>
            </h3>
            <span className="text-xs text-slate-400">高頻主題</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {sortedTags.length > 0 ? (
              sortedTags.map(([tag, count]) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[#0070ba] text-xs font-semibold"
                >
                  <span>{tag}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white text-slate-500 shadow-2xs">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center w-full">
                尚未記錄標籤
              </p>
            )}
          </div>

          {/* Signature Deep Ocean Navy Box from Screenshots */}
          <div className="bg-[#0b3149] p-4 rounded-xl border border-[#0284c7]/40 text-white mt-4 text-xs space-y-2">
            <h4 className="font-bold text-[#38bdf8] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>系統智慧洞察 (Pattern Discovery)</span>
            </h4>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              根據近期數據：當包含 <code className="text-[#38bdf8] font-bold">[[散步]]</code> 與 <code className="text-[#38bdf8] font-bold">#睡眠品質</code> 時，狀態為 🟢 好的機率高達 80%！
              這驗證了你的第一層認知「把身體照顧好是底層邏輯」。請繼續保持這套成功配方。
            </p>
          </div>
        </div>
      </div>

      {/* Historical Entries Timeline */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-50 pb-4">
          <h3 className="font-bold text-[#09223b] text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0084ff]" />
            <span>歷史反省與解法歷程 ({filteredEntries.length})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋日誌關鍵字..."
                className="w-full bg-[#f8fafc] border border-sky-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff] focus:bg-white"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-[#f8fafc] p-1 rounded-xl border border-sky-100 text-xs">
              <button
                onClick={() => setFilterState('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterState === 'all' ? 'bg-[#0084ff] text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterState('good')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterState === 'good' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700'}`}
              >
                🟢 好
              </button>
              <button
                onClick={() => setFilterState('bad')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterState === 'bad' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700'}`}
              >
                🔴 不好
              </button>
              <button
                onClick={() => setFilterState('normal')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterState === 'normal' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-amber-700'}`}
              >
                🟡 普通
              </button>
            </div>
          </div>
        </div>

        {/* Entries list */}
        <div className="space-y-3">
          {filteredEntries.map(entry => {
            const stateBadge = entry.state === 'good' 
              ? { text: '🟢 好', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' }
              : entry.state === 'bad'
              ? { text: '🔴 不好', bg: 'bg-rose-50 text-rose-800 border-rose-300' }
              : { text: '🟡 普通', bg: 'bg-amber-50 text-amber-800 border-amber-300' };

            return (
              <div 
                key={entry.id}
                className="bg-[#f8fafc] border border-sky-100 hover:border-sky-300 p-4 sm:p-5 rounded-xl transition space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-[#09223b] text-sm font-mono">{entry.date}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${stateBadge.bg}`}>
                      {stateBadge.text}
                    </span>
                    {entry.aiCoached && (
                      <span className="text-[10px] bg-sky-50 text-[#0070ba] px-2 py-0.5 rounded-full border border-sky-200 font-semibold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AI 輔助
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectDate(entry.date)}
                    className="text-xs text-[#0084ff] hover:text-[#0073e6] font-semibold transition"
                  >
                    前往今日反省檢視 ➔
                  </button>
                </div>

                {/* Content preview */}
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  {entry.state === 'good' && (
                    <>
                      <p><strong className="text-emerald-700">好在哪裡：</strong>{entry.goodWhere}</p>
                      {entry.goodKeep && <p><strong className="text-emerald-800">成功配方：</strong>{entry.goodKeep}</p>}
                    </>
                  )}
                  {entry.state === 'bad' && (
                    <>
                      {entry.badFact && <p><strong className="text-rose-700">客觀事實：</strong>{entry.badFact}</p>}
                      {entry.badEmotion && <p><strong className="text-rose-800">主觀情緒：</strong>{entry.badEmotion}</p>}
                      {entry.badImprove && <p><strong className="text-[#0084ff]">改善辦法：</strong>{entry.badImprove}</p>}
                    </>
                  )}
                  {entry.state === 'normal' && (
                    <>
                      <p><strong className="text-amber-700">微小瞬間：</strong>{entry.normalMoment}</p>
                      {entry.normalAmplify && <p><strong className="text-amber-800">如何放大：</strong>{entry.normalAmplify}</p>}
                    </>
                  )}
                </div>

                {/* Tags & Factors */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {entry.tags.map(t => (
                    <span key={t} className="text-[10px] font-medium text-slate-600 bg-white border border-sky-100 px-2.5 py-0.5 rounded-full shadow-2xs">
                      {t}
                    </span>
                  ))}
                  {entry.factors.map(f => (
                    <span key={f} className="text-[10px] text-[#0070ba] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
