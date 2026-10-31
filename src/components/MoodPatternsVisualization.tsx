import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  ReferenceLine
} from 'recharts';
import { DailyEntry } from '../types';
import { 
  Sparkles, 
  Calendar, 
  Activity, 
  PieChart as PieIcon, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Info,
  CalendarDays
} from 'lucide-react';

interface MoodPatternsVisualizationProps {
  entries: DailyEntry[];
  onSelectDate?: (date: string) => void;
  onRestoreSampleData?: () => void;
}

const STATE_COLORS = {
  good: '#4d6b53',    // Warm Olive Green (🟢 好日子 / 滋養)
  normal: '#d97706',  // Warm Amber (🟡 平凡 / 中性平靜)
  bad: '#e11d48',     // Crimson Rose (🔴 卡關 / 避坑復盤)
  unrecorded: '#ded9c8'
};

const DAY_OF_WEEK_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

export const MoodPatternsVisualization: React.FC<MoodPatternsVisualizationProps> = ({
  entries,
  onSelectDate,
  onRestoreSampleData
}) => {
  const [activeView, setActiveView] = useState<'timeline' | 'donut' | 'weekly' | 'all'>('timeline');
  const [windowDays, setWindowDays] = useState<number>(30);

  // 1. Compute 30-day chronological dataset
  const { 
    last30DaysData, 
    distributionCounts, 
    distributionPercentages, 
    weeklyData, 
    patternInsights,
    resilienceScore,
    longestGoodStreak
  } = useMemo(() => {
    // Determine the reference end date: either the latest entry date or 2026-10-30
    const sortedDates = [...entries].map(e => e.date).sort();
    const latestDateStr = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : '2026-10-30';
    
    // Parse latest date
    const [year, month, day] = latestDateStr.split('-').map(Number);
    const endDate = new Date(year, month - 1, day);

    // Create entry lookup map
    const entryMap = new Map<string, DailyEntry>();
    entries.forEach(e => entryMap.set(e.date, e));

    // Generate past N days (default 30)
    const daysData = [];
    let goodCount = 0;
    let normalCount = 0;
    let badCount = 0;
    let unrecordedCount = 0;

    // Track streaks & transitions for mood pattern analysis
    let currentGoodStreak = 0;
    let maxGoodStreak = 0;
    let badDayCountForResilience = 0;
    let badDayBouncedBackCount = 0;

    // Weekly aggregator: Sunday (0) to Saturday (6)
    const weekAgg = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      name: DAY_OF_WEEK_NAMES[i],
      good: 0,
      normal: 0,
      bad: 0,
      total: 0
    }));

    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const shortDate = `${mm}/${dd}`;
      const dayOfWeek = d.getDay();
      const dayName = DAY_OF_WEEK_NAMES[dayOfWeek];

      const entry = entryMap.get(dateKey);
      const state = entry ? entry.state : 'unrecorded';

      // Status values for visualization
      // Good = +1, Normal = 0.5 (or balanced), Bad = -1 (or level)
      let stateLevel = 0;
      let goodVal = 0;
      let normalVal = 0;
      let badVal = 0;

      if (state === 'good') {
        goodCount++;
        stateLevel = 1;
        goodVal = 1;
        currentGoodStreak++;
        if (currentGoodStreak > maxGoodStreak) maxGoodStreak = currentGoodStreak;
        weekAgg[dayOfWeek].good++;
        weekAgg[dayOfWeek].total++;
      } else if (state === 'normal') {
        normalCount++;
        stateLevel = 0;
        normalVal = 1;
        currentGoodStreak = 0;
        weekAgg[dayOfWeek].normal++;
        weekAgg[dayOfWeek].total++;
      } else if (state === 'bad') {
        badCount++;
        stateLevel = -1;
        badVal = 1;
        currentGoodStreak = 0;
        weekAgg[dayOfWeek].bad++;
        weekAgg[dayOfWeek].total++;
      } else {
        unrecordedCount++;
        currentGoodStreak = 0;
      }

      // Check resilience (if current was bad, does next day recover to normal or good?)
      // We look ahead to i - 1
      if (state === 'bad') {
        badDayCountForResilience++;
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        const nextKey = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;
        const nextEntry = entryMap.get(nextKey);
        if (nextEntry && (nextEntry.state === 'good' || nextEntry.state === 'normal')) {
          badDayBouncedBackCount++;
        }
      }

      daysData.push({
        date: dateKey,
        shortDate,
        dayName,
        label: `${shortDate} (${dayName})`,
        state,
        stateLevel,
        good: goodVal,
        normal: normalVal,
        bad: badVal,
        entry,
        summary: entry?.goodWhere || entry?.badFact || entry?.normalMoment || '無紀錄',
        tags: entry?.tags || [],
        factors: entry?.factors || []
      });
    }

    const totalRecorded = goodCount + normalCount + badCount;
    const goodPct = totalRecorded > 0 ? Math.round((goodCount / totalRecorded) * 100) : 0;
    const normalPct = totalRecorded > 0 ? Math.round((normalCount / totalRecorded) * 100) : 0;
    const badPct = totalRecorded > 0 ? Math.round((badCount / totalRecorded) * 100) : 0;

    const resilience = badDayCountForResilience > 0 
      ? Math.round((badDayBouncedBackCount / badDayCountForResilience) * 100)
      : 100;

    // Rearrange weeklyData to start from Monday (1, 2, 3, 4, 5, 6, 0)
    const reorderedWeekly = [
      weekAgg[1], // 週一
      weekAgg[2], // 週二
      weekAgg[3], // 週三
      weekAgg[4], // 週四
      weekAgg[5], // 週五
      weekAgg[6], // 週六
      weekAgg[0], // 週日
    ];

    // Find highest energy day of week
    let bestDay = reorderedWeekly[0];
    let mostChallengingDay = reorderedWeekly[0];
    reorderedWeekly.forEach(w => {
      const goodRate = w.total > 0 ? w.good / w.total : 0;
      const bestRate = bestDay.total > 0 ? bestDay.good / bestDay.total : 0;
      if (goodRate > bestRate) bestDay = w;

      const badRate = w.total > 0 ? w.bad / w.total : 0;
      const worstRate = mostChallengingDay.total > 0 ? mostChallengingDay.bad / mostChallengingDay.total : 0;
      if (badRate > worstRate) mostChallengingDay = w;
    });

    const insights = [
      {
        title: '30 天情緒健康比率',
        highlight: `好日子 ${goodPct}% / 平凡 ${normalPct}% / 復盤 ${badPct}%`,
        description: goodPct >= 50 
          ? `在過去 ${windowDays} 天中，高達 ${goodPct}% 的天數處於充實滋養狀態，遠高於內耗比例，代表個人生活系統運作穩健。`
          : `近期挑戰較多，建議檢視「客觀事實 vs 主觀情緒」拆解記錄，減少對不可控因素的過度反芻。`,
        color: 'text-[#4d6b53]'
      },
      {
        title: '情緒修復力指數 (Resilience)',
        highlight: `${resilience}% 隔天止損復原率`,
        description: `當遇到 🔴 卡關/低潮時，有 ${resilience}% 的機率在 24 小時內重回中性平靜或好日子，顯示「If-Then 應對防線」有效避免了情緒連環滾雪球。`,
        color: 'text-[#2c5832]'
      },
      {
        title: '週間情緒規律 (Weekly Rhythm)',
        highlight: `${bestDay.name}狀態最佳 · ${mostChallengingDay.name}需注意能量`,
        description: `${bestDay.name} 的好日子比例最高 (${bestDay.total > 0 ? Math.round((bestDay.good / bestDay.total) * 100) : 0}%)；而 ${mostChallengingDay.name} 容易遇到卡關事件，可在該日前一晚落實「早睡 30 分鐘」與「預先列出三件事」。`,
        color: 'text-amber-800'
      }
    ];

    return {
      last30DaysData: daysData,
      distributionCounts: {
        good: goodCount,
        normal: normalCount,
        bad: badCount,
        unrecorded: unrecordedCount,
        total: totalRecorded
      },
      distributionPercentages: {
        good: goodPct,
        normal: normalPct,
        bad: badPct
      },
      weeklyData: reorderedWeekly,
      patternInsights: insights,
      resilienceScore: resilience,
      longestGoodStreak: maxGoodStreak
    };
  }, [entries, windowDays]);

  // Donut chart data
  const pieData = useMemo(() => [
    { name: '🟢 好日子 (Good)', value: distributionCounts.good, color: STATE_COLORS.good, pct: distributionPercentages.good },
    { name: '🟡 平凡/中性 (Neutral)', value: distributionCounts.normal, color: STATE_COLORS.normal, pct: distributionPercentages.normal },
    { name: '🔴 卡關/復盤 (Bad)', value: distributionCounts.bad, color: STATE_COLORS.bad, pct: distributionPercentages.bad }
  ], [distributionCounts, distributionPercentages]);

  // Custom Tooltip for Timeline Bar Chart
  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const stateObj = data.state === 'good'
        ? { text: '🟢 好日子 (Good)', color: 'text-[#2c5832] bg-[#eff7ee] border-[#b8dab3]' }
        : data.state === 'normal'
        ? { text: '🟡 平凡中性 (Neutral)', color: 'text-amber-800 bg-amber-50 border-amber-300' }
        : data.state === 'bad'
        ? { text: '🔴 卡關復盤 (Bad)', color: 'text-rose-800 bg-rose-50 border-rose-300' }
        : { text: '⚪ 未記錄', color: 'text-slate-500 bg-slate-50 border-slate-200' };

      return (
        <div className="bg-[#fcfbf7] border border-[#ded9c8] p-3.5 rounded-xl shadow-lg max-w-xs text-xs space-y-2 pointer-events-none">
          <div className="flex items-center justify-between border-b border-[#e8e5d8] pb-1.5">
            <span className="font-extrabold text-[#222d25] font-mono">{data.date} ({data.dayName})</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stateObj.color}`}>
              {stateObj.text}
            </span>
          </div>

          <p className="text-[#3d463f] leading-snug">
            <strong className="text-[#222d25]">生活摘要：</strong>
            {data.summary}
          </p>

          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {data.tags.map((t: string) => (
                <span key={t} className="text-[10px] bg-white border border-[#ded9c8] text-[#616c62] px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
              {data.factors.map((f: string) => (
                <span key={f} className="text-[10px] bg-[#eff4ec] border border-[#c8d8c3] text-[#3d5942] px-1.5 py-0.5 rounded font-mono">
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="text-[10px] text-[#778378] italic pt-1 border-t border-[#f0ece1]">
            點擊圖表柱體可直接查看當日反省
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#fcfbf7] rounded-2xl border border-[#e8e5d8] p-6 space-y-6 shadow-sm shadow-[#4d6b53]/5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e5d8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#eff4ec] text-[#4d6b53] rounded-xl border border-[#c8d8c3]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#222d25] flex items-center gap-2">
                <span>近 30 天情緒狀態分佈與模式識別</span>
                <span className="text-[11px] font-semibold text-[#3d5942] bg-[#eff4ec] px-2.5 py-0.5 rounded-full border border-[#c8d8c3]">
                  Recharts 動態分析
                </span>
              </h3>
              <p className="text-xs text-[#616c62] mt-0.5">
                追蹤 Good（🟢 好日子）、Neutral（🟡 平凡平靜）、Bad（🔴 卡關）分佈，辨識身心規律與情緒復原模式
              </p>
            </div>
          </div>
        </div>

        {/* View Switchers & Range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day range buttons */}
          <div className="flex items-center bg-[#f8f7f2] p-1 rounded-xl border border-[#ded9c8] text-xs">
            <button
              onClick={() => setWindowDays(14)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                windowDays === 14 ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              14 天
            </button>
            <button
              onClick={() => setWindowDays(30)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                windowDays === 30 ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              30 天
            </button>
          </div>

          {/* Mode switch */}
          <div className="flex items-center bg-[#f8f7f2] p-1 rounded-xl border border-[#ded9c8] text-xs">
            <button
              onClick={() => setActiveView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeView === 'timeline' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>走勢條形圖</span>
            </button>
            <button
              onClick={() => setActiveView('donut')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeView === 'donut' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>佔比圓餅圖</span>
            </button>
            <button
              onClick={() => setActiveView('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeView === 'weekly' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>週間規律</span>
            </button>
            <button
              onClick={() => setActiveView('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                activeView === 'all' ? 'bg-[#4d6b53] text-white shadow-xs' : 'text-[#616c62] hover:text-[#222d25]'
              }`}
            >
              <span>全景看版</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#f8f7f2] p-3.5 rounded-xl border border-[#ded9c8] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#616c62]">🟢 好日子 (Good)</div>
            <div className="text-xl font-extrabold text-[#2c5832]">
              {distributionCounts.good} <span className="text-xs font-normal text-[#616c62]">天 ({distributionPercentages.good}%)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#eff7ee] border border-[#b8dab3] flex items-center justify-center text-[#2c5832] font-bold text-xs">
            🌿
          </div>
        </div>

        <div className="bg-[#f8f7f2] p-3.5 rounded-xl border border-[#ded9c8] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#616c62]">🟡 平凡平靜 (Neutral)</div>
            <div className="text-xl font-extrabold text-amber-700">
              {distributionCounts.normal} <span className="text-xs font-normal text-[#616c62]">天 ({distributionPercentages.normal}%)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 font-bold text-xs">
            ☕
          </div>
        </div>

        <div className="bg-[#f8f7f2] p-3.5 rounded-xl border border-[#ded9c8] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#616c62]">🔴 卡關避坑 (Bad)</div>
            <div className="text-xl font-extrabold text-rose-700">
              {distributionCounts.bad} <span className="text-xs font-normal text-[#616c62]">天 ({distributionPercentages.bad}%)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-300 flex items-center justify-center text-rose-700 font-bold text-xs">
            🛡️
          </div>
        </div>

        <div className="bg-[#f8f7f2] p-3.5 rounded-xl border border-[#ded9c8] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#616c62]">最長好心情連續</div>
            <div className="text-xl font-extrabold text-[#4d6b53]">
              {longestGoodStreak} <span className="text-xs font-normal text-[#616c62]">天連勝</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#eff4ec] border border-[#c8d8c3] flex items-center justify-center text-[#4d6b53]">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Visualizations Area */}
      {activeView === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#222d25] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4d6b53]" />
              <span>近 {windowDays} 天每日狀態走勢分佈 (綠: 🟢 好 / 琥珀: 🟡 平 / 紅: 🔴 卡關)</span>
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-[#616c62]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#4d6b53] inline-block" /> 好日子
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706] inline-block" /> 平凡中性
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48] inline-block" /> 卡關復盤
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last30DaysData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0] && onSelectDate) {
                    onSelectDate(e.activePayload[0].payload.date);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e5d8" />
                <XAxis 
                  dataKey="shortDate" 
                  tick={{ fill: '#778378', fontSize: 10 }}
                  tickLine={{ stroke: '#ded9c8' }}
                  axisLine={{ stroke: '#ded9c8' }}
                  angle={-45}
                  textAnchor="end"
                  height={35}
                />
                <YAxis 
                  ticks={[-1, 0, 1]}
                  domain={[-1.2, 1.2]}
                  tickFormatter={(val) => {
                    if (val === 1) return '🟢 好';
                    if (val === 0) return '🟡 平';
                    if (val === -1) return '🔴 難';
                    return '';
                  }}
                  tick={{ fill: '#616c62', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#ded9c8' }}
                />
                <ReferenceLine y={0} stroke="#ded9c8" strokeWidth={1} />
                <Tooltip content={<CustomTimelineTooltip />} />
                <Bar 
                  dataKey="stateLevel" 
                  radius={[4, 4, 4, 4]}
                  maxBarSize={22}
                  cursor="pointer"
                >
                  {last30DaysData.map((entry, index) => {
                    let fillColor = STATE_COLORS.unrecorded;
                    if (entry.state === 'good') fillColor = STATE_COLORS.good;
                    else if (entry.state === 'normal') fillColor = STATE_COLORS.normal;
                    else if (entry.state === 'bad') fillColor = STATE_COLORS.bad;
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#778378] text-right">
            提示：上方直條圖高於基準線代表充實滋養（🟢），在基準線為平靜微光（🟡），低於基準線為卡關待解（🔴）。
          </p>
        </div>
      )}

      {activeView === 'donut' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Donut Chart */}
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fcfbf7" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} 天`, name]}
                  contentStyle={{ backgroundColor: '#fcfbf7', borderColor: '#ded9c8', borderRadius: '0.75rem', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-extrabold text-[#222d25]">{distributionCounts.total} 天</span>
              <span className="text-[11px] text-[#616c62] font-medium">近 {windowDays} 天分佈</span>
            </div>
          </div>

          {/* Breakdown description */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#222d25] border-b border-[#e8e5d8] pb-2">
              狀態佔比與心理學解讀
            </h4>
            
            <div className="space-y-2.5">
              <div className="bg-[#f8f7f2] p-3 rounded-xl border border-[#b8dab3] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#4d6b53]" />
                  <div>
                    <div className="text-xs font-bold text-[#2c5832]">🟢 好日子 (Good)</div>
                    <div className="text-[11px] text-[#616c62]">身心充實、執行成功配方</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[#2c5832]">{distributionCounts.good} 天</div>
                  <div className="text-[11px] text-[#616c62]">{distributionPercentages.good}%</div>
                </div>
              </div>

              <div className="bg-[#f8f7f2] p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#d97706]" />
                  <div>
                    <div className="text-xs font-bold text-amber-800">🟡 平凡中性 (Neutral)</div>
                    <div className="text-[11px] text-[#616c62]">安於日常、感受細微美好</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-amber-700">{distributionCounts.normal} 天</div>
                  <div className="text-[11px] text-[#616c62]">{distributionPercentages.normal}%</div>
                </div>
              </div>

              <div className="bg-[#f8f7f2] p-3 rounded-xl border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#e11d48]" />
                  <div>
                    <div className="text-xs font-bold text-rose-800">🔴 卡關復盤 (Bad)</div>
                    <div className="text-[11px] text-[#616c62]">客觀歸因、轉化為避坑指南</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-rose-700">{distributionCounts.bad} 天</div>
                  <div className="text-[11px] text-[#616c62]">{distributionPercentages.bad}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'weekly' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#222d25] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#4d6b53]" />
              <span>週間規律分佈 (週一至週日各狀態累積天數)</span>
            </h4>
            <span className="text-[11px] text-[#616c62]">幫助識別不同星期的能量週期</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e5d8" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#778378', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#ded9c8' }}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fill: '#778378', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#ded9c8' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fcfbf7', borderColor: '#ded9c8', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(val: any, name: any) => {
                    const label = name === 'good' ? '🟢 好日子' : name === 'normal' ? '🟡 平凡' : '🔴 卡關';
                    return [`${val} 天`, label];
                  }}
                />
                <Legend 
                  formatter={(val) => {
                    if (val === 'good') return <span className="text-xs text-[#2c5832] font-semibold">🟢 好日子</span>;
                    if (val === 'normal') return <span className="text-xs text-amber-700 font-semibold">🟡 平凡</span>;
                    if (val === 'bad') return <span className="text-xs text-rose-700 font-semibold">🔴 卡關</span>;
                    return val;
                  }}
                />
                <Bar dataKey="good" name="good" fill={STATE_COLORS.good} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="normal" name="normal" fill={STATE_COLORS.normal} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="bad" name="bad" fill={STATE_COLORS.bad} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeView === 'all' && (
        <div className="space-y-6">
          {/* Top: Timeline & Donut combined */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <h5 className="text-xs font-bold text-[#222d25]">近 30 天每日狀態變化線</h5>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last30DaysData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e5d8" />
                    <XAxis dataKey="shortDate" tick={{ fill: '#778378', fontSize: 9 }} angle={-45} textAnchor="end" height={30} />
                    <YAxis ticks={[-1, 0, 1]} domain={[-1.2, 1.2]} tick={{ fill: '#616c62', fontSize: 9 }} />
                    <ReferenceLine y={0} stroke="#ded9c8" />
                    <Tooltip content={<CustomTimelineTooltip />} />
                    <Bar dataKey="stateLevel" radius={[3, 3, 3, 3]}>
                      {last30DaysData.map((e, idx) => (
                        <Cell 
                          key={idx} 
                          fill={e.state === 'good' ? STATE_COLORS.good : e.state === 'normal' ? STATE_COLORS.normal : STATE_COLORS.bad} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#222d25] text-center">狀態佔比</h5>
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {pieData.map((e, idx) => (
                        <Cell key={idx} fill={e.color} stroke="#fcfbf7" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} 天`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-sm font-extrabold text-[#222d25]">{distributionCounts.total} 天</span>
                  <span className="text-[10px] text-[#616c62]">紀錄總數</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mood Patterns & Psychological Discovery Cards */}
      <div className="border-t border-[#e8e5d8] pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#4d6b53]" />
          <h4 className="text-xs font-bold text-[#222d25]">
            情緒模式辨識與實踐反饋 (Mood Pattern Insights)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {patternInsights.map((insight, idx) => (
            <div key={idx} className="bg-[#f8f7f2] p-3.5 rounded-xl border border-[#ded9c8] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#616c62]">{insight.title}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#4d6b53]" />
              </div>
              <div className={`text-xs font-extrabold ${insight.color}`}>{insight.highlight}</div>
              <p className="text-[11px] text-[#4d564f] leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
