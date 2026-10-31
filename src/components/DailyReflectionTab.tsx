import React, { useState, useEffect } from 'react';
import { DailyEntry, DayState, PersonalOS } from '../types';
import { askAICoach, CoachResponseResult } from '../services/coachService';
import { generateDailyNoteMarkdown, downloadFile } from '../utils/markdownExporter';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Copy, 
  Download, 
  Check, 
  BrainCircuit, 
  PlusCircle, 
  Tag
} from 'lucide-react';

interface DailyReflectionTabProps {
  entries: DailyEntry[];
  onSaveEntry: (entry: DailyEntry) => void;
  personalOS: PersonalOS;
  onAddIfThenStrategy: (ifText: string, thenText: string, category?: 'work' | 'health' | 'emotion' | 'life') => void;
}

export const DailyReflectionTab: React.FC<DailyReflectionTabProps> = ({
  entries,
  onSaveEntry,
  personalOS,
  onAddIfThenStrategy
}) => {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [copied, setCopied] = useState(false);
  const [strategyAdded, setStrategyAdded] = useState<string | null>(null);

  // Active form state
  const [state, setState] = useState<DayState>('good');
  const [goodWhere, setGoodWhere] = useState('');
  const [goodKeep, setGoodKeep] = useState('');
  const [badFact, setBadFact] = useState('');
  const [badEmotion, setBadEmotion] = useState('');
  const [badReason, setBadReason] = useState('');
  const [badImprove, setBadImprove] = useState('');
  const [normalMoment, setNormalMoment] = useState('');
  const [normalAmplify, setNormalAmplify] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#日常生活']);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customFactorInput, setCustomFactorInput] = useState('');

  // AI Coach state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<CoachResponseResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing entry when date changes
  useEffect(() => {
    const existing = entries.find(e => e.date === selectedDate);
    if (existing) {
      setState(existing.state);
      setGoodWhere(existing.goodWhere || '');
      setGoodKeep(existing.goodKeep || '');
      setBadFact(existing.badFact || '');
      setBadEmotion(existing.badEmotion || '');
      setBadReason(existing.badReason || '');
      setBadImprove(existing.badImprove || '');
      setNormalMoment(existing.normalMoment || '');
      setNormalAmplify(existing.normalAmplify || '');
      setSelectedTags(existing.tags || []);
      setSelectedFactors(existing.factors || []);
      setAiAdvice(existing.aiAdvice || null);
    } else {
      // Defaults for a new entry
      setState('good');
      setGoodWhere('');
      setGoodKeep('');
      setBadFact('');
      setBadEmotion('');
      setBadReason('');
      setBadImprove('');
      setNormalMoment('');
      setNormalAmplify('');
      setSelectedTags(['#日常生活']);
      setSelectedFactors([]);
      setAiAdvice(null);
    }
  }, [selectedDate, entries]);

  // Handle calling the AI Coach
  const handleCallAICoach = async () => {
    setIsAiLoading(true);
    const data = {
      goodWhere,
      goodKeep,
      badFact,
      badEmotion,
      badReason,
      badImprove,
      normalMoment,
      normalAmplify,
      tags: selectedTags.join(', '),
      factors: selectedFactors.join(', ')
    };

    try {
      const response = await askAICoach(state, data, personalOS);
      setAiAdvice(response.result);

      // Auto add suggested tag if available
      if (response.result.suggestedTag) {
        const parts = response.result.suggestedTag.split(' ');
        parts.forEach(p => {
          if (p.startsWith('#') && !selectedTags.includes(p)) {
            setSelectedTags(prev => [...prev, p]);
          } else if (p.startsWith('[[') && !selectedFactors.includes(p)) {
            setSelectedFactors(prev => [...prev, p]);
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Adopt AI strategy into the form field
  const handleAdoptStrategy = (strat: string) => {
    if (state === 'bad') {
      setBadImprove(prev => prev ? `${prev}\n- ${strat}` : strat);
    } else if (state === 'good') {
      setGoodKeep(prev => prev ? `${prev}\n- ${strat}` : strat);
    } else {
      setNormalAmplify(prev => prev ? `${prev}\n- ${strat}` : strat);
    }
  };

  // Push strategy directly to Personal OS (closed-loop feedback)
  const handleAddToPersonalOS = (strat: string) => {
    const match = strat.match(/If\s+(.*?),\s*Then\s+(.*)/i);
    if (match) {
      onAddIfThenStrategy(match[1].trim(), match[2].trim(), state === 'bad' ? 'emotion' : 'life');
    } else {
      onAddIfThenStrategy('遇到此情境', strat, 'life');
    }
    setStrategyAdded(strat);
    setTimeout(() => setStrategyAdded(null), 3000);
  };

  // Save the entry
  const handleSave = () => {
    const entry: DailyEntry = {
      id: `entry-${selectedDate}`,
      date: selectedDate,
      state,
      goodWhere: state === 'good' ? goodWhere : undefined,
      goodKeep: state === 'good' ? goodKeep : undefined,
      badFact: state === 'bad' ? badFact : undefined,
      badEmotion: state === 'bad' ? badEmotion : undefined,
      badReason: state === 'bad' ? badReason : undefined,
      badImprove: state === 'bad' ? badImprove : undefined,
      normalMoment: state === 'normal' ? normalMoment : undefined,
      normalAmplify: state === 'normal' ? normalAmplify : undefined,
      tags: selectedTags,
      factors: selectedFactors,
      aiCoached: !!aiAdvice,
      aiAdvice: aiAdvice || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveEntry(entry);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (state === 'good') {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // Copy Obsidian Markdown
  const handleCopyMarkdown = () => {
    const currentEntry: DailyEntry = {
      id: `entry-${selectedDate}`,
      date: selectedDate,
      state,
      goodWhere,
      goodKeep,
      badFact,
      badEmotion,
      badReason,
      badImprove,
      normalMoment,
      normalAmplify,
      tags: selectedTags,
      factors: selectedFactors,
      aiAdvice: aiAdvice || undefined,
      createdAt: '',
      updatedAt: ''
    };
    const md = generateDailyNoteMarkdown(currentEntry, personalOS);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download Obsidian Markdown
  const handleDownloadMarkdown = () => {
    const currentEntry: DailyEntry = {
      id: `entry-${selectedDate}`,
      date: selectedDate,
      state,
      goodWhere,
      goodKeep,
      badFact,
      badEmotion,
      badReason,
      badImprove,
      normalMoment,
      normalAmplify,
      tags: selectedTags,
      factors: selectedFactors,
      aiAdvice: aiAdvice || undefined,
      createdAt: '',
      updatedAt: ''
    };
    const md = generateDailyNoteMarkdown(currentEntry, personalOS);
    downloadFile(`${selectedDate}.md`, md);
  };

  const commonTags = [
    '#睡眠品質', '#職場溝通', '#課題分離', '#高效產出', 
    '#微小幸福', '#情緒煞車', '#運動健身', '#美食撫慰', '#界線建立'
  ];

  const commonFactors = [
    '[[散步]]', '[[老闆]]', '[[客戶]]', '[[早睡]]', 
    '[[咖啡]]', '[[運動]]', '[[閱讀]]', '[[手機離床]]'
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleFactor = (factor: string) => {
    if (selectedFactors.includes(factor)) {
      setSelectedFactors(selectedFactors.filter(f => f !== factor));
    } else {
      setSelectedFactors([...selectedFactors, factor]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      const formatted = customTagInput.startsWith('#') ? customTagInput.trim() : `#${customTagInput.trim()}`;
      if (!selectedTags.includes(formatted)) {
        setSelectedTags([...selectedTags, formatted]);
      }
      setCustomTagInput('');
    }
  };

  const handleAddCustomFactor = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customFactorInput.trim()) {
      const val = customFactorInput.trim();
      const formatted = val.startsWith('[[') && val.endsWith(']]') ? val : `[[${val}]]`;
      if (!selectedFactors.includes(formatted)) {
        setSelectedFactors([...selectedFactors, formatted]);
      }
      setCustomFactorInput('');
    }
  };

  const activeStrategies = personalOS.ifThenStrategies.filter(s => s.active);
  const activeHabits = personalOS.habitQuestions.filter(h => h.active);

  return (
    <div className="space-y-6 pb-12">
      {/* Date Header & Quick Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm shadow-sky-900/5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-50 text-[#0084ff]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#09223b]">
                反省日誌日期
              </h2>
              <span className="text-xs font-semibold text-[#0070ba] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                {selectedDate === getTodayString() ? '今天' : selectedDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              透過直覺式的每日歸零，將日子經營成一本自帶修復力的人生地圖
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#f8fafc] border border-sky-200 text-slate-700 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#0084ff] focus:bg-white shadow-xs"
          />
          <button
            onClick={() => setSelectedDate(getTodayString())}
            className="text-xs px-3 py-1.5 bg-white hover:bg-sky-50 text-[#0070ba] font-semibold rounded-xl border border-sky-200 transition shadow-xs"
          >
            回今天
          </button>
        </div>
      </div>

      {/* 🛡️ 晨間防禦機制 (Signature Deep Ocean Navy Box from Screenshots) */}
      <div className="bg-[#0b3149] rounded-2xl border border-[#0284c7]/30 p-5 shadow-lg shadow-sky-950/15 text-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-3.5 border-b border-[#0d3b5b] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0084ff]/20 text-[#38bdf8]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base tracking-wide">
              🛡️ 今日防禦與策略 (系統自動回饋)
            </h3>
          </div>
          <span className="text-xs text-[#7dd3fc] bg-[#072438] px-3 py-0.5 rounded-full border border-[#0284c7]/40 font-mono">
            ![[個人操作手冊]] 自動投影
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active If-Then */}
          <div className="bg-[#072236]/90 rounded-xl p-4 border border-[#0d3d5f]">
            <h4 className="text-xs font-bold text-[#7dd3fc] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>⚡ 本週 If-Then 策略</span>
              <span className="text-[10px] text-sky-400/80 font-normal">（日間即時干預）</span>
            </h4>
            {activeStrategies.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {activeStrategies.map((strat) => (
                  <li key={strat.id} className="flex items-start gap-2 bg-[#0c2f4a] p-2.5 rounded-lg border border-[#14476e]/60 text-slate-200">
                    <span className="text-[#38bdf8] font-extrabold shrink-0 mt-0.5">If</span>
                    <span className="text-slate-200">{strat.ifText}，</span>
                    <span className="text-amber-300 font-extrabold shrink-0 mt-0.5">Then</span>
                    <span className="text-white font-semibold">{strat.thenText}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-sky-300/60 italic py-2">
                尚未啟用任何策略，可在《個人操作手冊》中勾選啟用。
              </p>
            )}
          </div>

          {/* Active Habits */}
          <div className="bg-[#072236]/90 rounded-xl p-4 border border-[#0d3d5f]">
            <h4 className="text-xs font-bold text-[#7dd3fc] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>🎯 本週短期外掛提問</span>
              <span className="text-[10px] text-sky-400/80 font-normal">（刻意練習）</span>
            </h4>
            {activeHabits.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {activeHabits.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-2.5 bg-[#0c2f4a] p-2.5 rounded-lg border border-[#14476e]/60 text-slate-200">
                    <div className="w-4 h-4 rounded border border-[#38bdf8] flex items-center justify-center text-[#38bdf8] text-xs font-bold">
                      ✓
                    </div>
                    <span className="text-white font-medium">{habit.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-sky-300/60 italic py-2">
                尚未啟用任何提問，可在《個人操作手冊》中啟用。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 🧭 第一層：狀態檢核：「我今天過得好嗎？」 */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6 sm:p-8 shadow-sm shadow-sky-900/5">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="text-xs uppercase tracking-wider text-[#0084ff] font-bold mb-1 block">
            極低阻力的睡前啟動點
          </span>
          <h3 className="text-2xl font-extrabold text-[#09223b] tracking-tight">
            我今天過得好嗎？
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            無論今天如何，都只是一筆幫助系統迭代的寶貴數據。
          </p>
        </div>

        {/* 3 Branch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto mb-8">
          {/* 🟢 好 */}
          <button
            type="button"
            onClick={() => setState('good')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              state === 'good'
                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/30 shadow-md shadow-emerald-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mb-2 shadow-xs">
              🟢
            </div>
            <span className="font-bold text-base text-[#09223b]">好！</span>
            <span className="text-xs text-slate-500 mt-0.5">有成就、順利、能量充沛</span>
            <span className="text-[11px] text-emerald-700 mt-2 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
              提煉成功配方
            </span>
          </button>

          {/* 🔴 不好 */}
          <button
            type="button"
            onClick={() => setState('bad')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              state === 'bad'
                ? 'bg-rose-50/90 border-rose-400 text-rose-950 ring-2 ring-rose-400/30 shadow-md shadow-rose-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50/30'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl mb-2 shadow-xs">
              🔴
            </div>
            <span className="font-bold text-base text-[#09223b]">不好</span>
            <span className="text-xs text-slate-500 mt-0.5">內耗、受挫、疲憊、卡關</span>
            <span className="text-[11px] text-rose-700 mt-2 font-semibold bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-300/60">
              解題模式 · 課題分離
            </span>
          </button>

          {/* 🟡 普通 */}
          <button
            type="button"
            onClick={() => setState('normal')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              state === 'normal'
                ? 'bg-amber-50/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/30'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-2 shadow-xs">
              🟡
            </div>
            <span className="font-bold text-base text-[#09223b]">普通</span>
            <span className="text-xs text-slate-500 mt-0.5">平凡如水、說不上好壞</span>
            <span className="text-[11px] text-amber-800 mt-2 font-semibold bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
              捕捉微小瞬間
            </span>
          </button>
        </div>

        {/* Dynamic Form Sections */}
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* 🟢 IF GOOD */}
          {state === 'good' && (
            <div className="space-y-4 bg-emerald-50/40 border border-emerald-200 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <span>🟢 狀態：好 — 轉化為可複製的成功配方</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. 好在哪裡？ <span className="text-slate-400 font-normal">（今天完成了什麼？有什麼值得開心的事？）</span>
                </label>
                <textarea
                  rows={2}
                  value={goodWhere}
                  onChange={(e) => setGoodWhere(e.target.value)}
                  placeholder="例如：今天工作效率極高，提早下班，還去公園慢跑了 30 分鐘..."
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff] focus:ring-2 focus:ring-sky-100 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    2. 如何保持 / 我的成功配方是什麼？
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-[#0070ba] hover:text-[#0084ff] font-semibold bg-white hover:bg-sky-50 border border-sky-300 px-3 py-1 rounded-full transition shadow-xs"
                  >
                    <BrainCircuit className="w-3.5 h-3.5 text-[#0084ff]" />
                    <span>{isAiLoading ? 'AI 分析中...' : '大腦累了？讓 AI 提煉配方'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={goodKeep}
                  onChange={(e) => setGoodKeep(e.target.value)}
                  placeholder="例如：昨晚睡滿 7.5 小時，且早上先吃了蛋白質豐富的早餐。➡️ 知識庫提煉：睡眠+蛋白質=高效率"
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff] focus:ring-2 focus:ring-sky-100 transition"
                />
              </div>
            </div>
          )}

          {/* 🔴 IF BAD */}
          {state === 'bad' && (
            <div className="space-y-4 bg-rose-50/40 border border-rose-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <span>🔴 狀態：不好 — 切斷情緒內耗，進入「解題模式」</span>
                </div>
                <span className="text-[11px] bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300 font-medium">
                  💡 區分「客觀事實」與「主觀情緒」
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>1. 不好在哪裡？（客觀事實）</span>
                    <span className="text-[10px] text-slate-400">鏡頭拍得到的</span>
                  </label>
                  <textarea
                    rows={2}
                    value={badFact}
                    onChange={(e) => setBadFact(e.target.value)}
                    placeholder="例如：下午主管退回了我的提案，要求週五前重做..."
                    className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>主觀情緒（內心感受）</span>
                    <span className="text-[10px] text-slate-400">大腦附加的劇本</span>
                  </label>
                  <textarea
                    rows={2}
                    value={badEmotion}
                    onChange={(e) => setBadEmotion(e.target.value)}
                    placeholder="例如：覺得委屈、丟臉，覺得自己能力很差，很想擺爛..."
                    className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. 什麼原因？ <span className="text-slate-400 font-normal">（客觀找出生活中的 bug，不帶自我批判）</span>
                </label>
                <textarea
                  rows={2}
                  value={badReason}
                  onChange={(e) => setBadReason(e.target.value)}
                  placeholder="例如：提案前沒有先跟主管對焦核心指標，且今天因為太忙沒吃午餐，血糖低容易情緒失控..."
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    3. 明天有什麼辦法改善？ <span className="text-slate-400 font-normal">（只要 1% 的微小改變）</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 font-semibold bg-white hover:bg-rose-50 border border-rose-300 px-3 py-1 rounded-full transition shadow-xs"
                  >
                    <BrainCircuit className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isAiLoading ? 'AI 教練思考中...' : '認知枯竭？讓 AI 教練給予 If-Then 解法'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={badImprove}
                  onChange={(e) => setBadImprove(e.target.value)}
                  placeholder="例如：If 明天做提案前，Then 先花 5 分鐘寫大綱跟主管口頭確認。If 餓了，Then 先吃顆茶葉蛋。"
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition"
                />
              </div>
            </div>
          )}

          {/* 🟡 IF NORMAL */}
          {state === 'normal' && (
            <div className="space-y-4 bg-amber-50/40 border border-amber-200 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <span>🟡 狀態：普通 — 在平凡如水中捕捉順利與平靜</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. 今天有哪個微小的瞬間，讓我感覺平靜或順利？
                </label>
                <textarea
                  rows={2}
                  value={normalMoment}
                  onChange={(e) => setNormalMoment(e.target.value)}
                  placeholder="例如：下班路上微風吹過來很舒服 / 今天的晚餐很熱很香 / 捷運剛好有位子坐..."
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    2. 如何把這個瞬間放大或複製？
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-semibold bg-white hover:bg-amber-50 border border-amber-300 px-3 py-1 rounded-full transition shadow-xs"
                  >
                    <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAiLoading ? 'AI 構思中...' : '讓 AI 設計微小放大儀式'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={normalAmplify}
                  onChange={(e) => setNormalAmplify(e.target.value)}
                  placeholder="例如：把那首歌加入放鬆歌單 / 明天下班也在那個站下車散步 10 分鐘..."
                  className="w-full bg-white border border-sky-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                />
              </div>
            </div>
          )}

          {/* 🤖 AI 認知副處理器建議結果卡片 (Signature Deep Ocean Navy Box from Screenshots) */}
          {aiAdvice && (
            <div className="bg-[#0b3149] border border-[#0284c7]/40 rounded-2xl p-6 shadow-xl shadow-sky-950/20 text-white relative overflow-hidden">
              <div className="flex items-center justify-between mb-3.5 border-b border-[#0d3b5b] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#0084ff]/30 text-[#38bdf8]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    🤖 AI 認知副處理器 · 解法與心理洞察
                  </h4>
                </div>
                <span className="text-xs text-[#7dd3fc] bg-[#072438] px-2.5 py-0.5 rounded-full border border-[#0284c7]/40 font-medium">
                  阿德勒課題分離 & 福格微小行為
                </span>
              </div>

              {/* Psychological Insight */}
              <div className="bg-[#072438] border border-[#14476e]/70 rounded-xl p-3.5 text-xs text-slate-200 mb-4 leading-relaxed">
                <span className="text-[#38bdf8] font-bold block mb-1">
                  💡 心理學與思維拆解：
                </span>
                {aiAdvice.psychologicalInsight}
              </div>

              {/* Strategies */}
              <div className="space-y-2.5 mb-4">
                <div className="text-xs font-bold text-[#7dd3fc] flex items-center justify-between">
                  <span>⚡ 建議採用的 If-Then 行為策略：</span>
                  <span className="text-[11px] text-sky-300/70 font-normal">
                    點擊「採用」填入筆記，或「加入手冊」隔天自動投影
                  </span>
                </div>
                {aiAdvice.strategies.map((strat, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#0c2f4a] p-3 rounded-xl border border-[#14476e] text-xs"
                  >
                    <span className="text-white font-mono leading-relaxed">{strat}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdoptStrategy(strat)}
                        className="px-3 py-1 bg-[#0084ff] text-white hover:bg-[#0073e6] font-semibold rounded-lg transition shadow-xs"
                      >
                        採用填入
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToPersonalOS(strat)}
                        className="px-3 py-1 bg-[#072438] text-[#7dd3fc] hover:bg-[#0a314d] border border-[#0284c7]/50 rounded-lg transition flex items-center gap-1 font-semibold"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>加入手冊</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {strategyAdded && (
                <div className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 p-2.5 rounded-lg flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>已成功將策略「{strategyAdded}」加入《個人操作手冊》，明天晨間自動防禦！</span>
                </div>
              )}

              {/* Encouragement */}
              {aiAdvice.encouragement && (
                <div className="text-xs text-sky-200/90 italic border-t border-[#0d3b5b] pt-3 flex items-center gap-2">
                  <span className="text-[#38bdf8] font-bold">“</span>
                  <span>{aiAdvice.encouragement}</span>
                </div>
              )}
            </div>
          )}

          {/* 🏷️ 標籤與雙向連結 (Tags & Backlinks) */}
          <div className="bg-white border border-sky-100 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm shadow-sky-900/5">
            <h4 className="text-xs font-bold text-[#09223b] uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0084ff]" />
              <span>今日標籤 (Tags) 與 雙向連結 (Backlinks)</span>
              <span className="text-[10px] text-slate-400 font-normal">（建構知識庫與關係網的核心）</span>
            </h4>

            {/* Tags Selection */}
            <div>
              <span className="text-xs text-slate-500 block mb-2 font-medium">常用標籤 #：</span>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {commonTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1 rounded-full transition font-medium ${
                        isSelected
                          ? 'bg-[#0084ff] text-white shadow-xs'
                          : 'bg-sky-50 text-[#0070ba] hover:bg-sky-100 border border-sky-200/70'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="輸入自訂標籤後按 Enter（例如：#專案卡關）"
                className="w-full bg-[#f8fafc] border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff] focus:bg-white"
              />
            </div>

            {/* Backlinks [[ ]] Selection */}
            <div>
              <span className="text-xs text-slate-500 block mb-2 font-medium">關鍵因素雙向連結 [[ ]]：</span>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {commonFactors.map(factor => {
                  const isSelected = selectedFactors.includes(factor);
                  return (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => toggleFactor(factor)}
                      className={`text-xs px-3 py-1 rounded-full transition font-mono ${
                        isSelected
                          ? 'bg-[#0084ff] text-white shadow-xs font-semibold'
                          : 'bg-white text-[#0070ba] hover:bg-sky-50 border border-sky-300'
                      }`}
                    >
                      {factor}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customFactorInput}
                onChange={(e) => setCustomFactorInput(e.target.value)}
                onKeyDown={handleAddCustomFactor}
                placeholder="輸入自訂關鍵詞後按 Enter（例如：同事A 或 早午餐）"
                className="w-full bg-[#f8fafc] border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff] focus:bg-white"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sky-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold text-sm shadow-md shadow-sky-500/25 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>儲存今日日誌</span>
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-bold animate-pulse">
                  <Check className="w-3.5 h-3.5" /> 已記錄歸檔
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 text-xs border border-sky-200 font-medium transition shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? '已複製 Obsidian 格式' : '複製 Obsidian MD'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 text-xs border border-sky-200 font-medium transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>下載 .md</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
