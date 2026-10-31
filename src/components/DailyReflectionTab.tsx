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
  Lightbulb, 
  PlusCircle, 
  AlertTriangle,
  ArrowRight
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
    // Parse "If ... Then ..." format
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-stone-800 text-stone-300">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <span>反省日誌日期</span>
              <span className="text-xs font-normal text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                {selectedDate === getTodayString() ? '今天' : selectedDate}
              </span>
            </h2>
            <p className="text-xs text-stone-400">
              透過直覺式的每日歸零，將日子經營成一本自帶修復力的人生地圖
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => setSelectedDate(getTodayString())}
            className="text-xs px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition"
          >
            回今天
          </button>
        </div>
      </div>

      {/* 🛡️ 晨間防禦機制 (Closed-Loop Transclusion from Personal OS) */}
      <div className="bg-stone-900/90 rounded-2xl border border-emerald-900/50 p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-center justify-between mb-3 border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-stone-100 text-sm sm:text-base flex items-center gap-2">
              <span>🛡️ 今日防禦與策略 (系統自動回饋)</span>
            </h3>
          </div>
          <span className="text-xs text-emerald-400/90 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
            Obsidian 區塊引用 ![[個人操作手冊]]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active If-Then */}
          <div className="bg-stone-950/60 rounded-xl p-3.5 border border-stone-800/70">
            <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚡ 本週 If-Then 策略</span>
              <span className="text-[10px] text-stone-500 font-normal">（日間即時干預）</span>
            </h4>
            {activeStrategies.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-300">
                {activeStrategies.map((strat) => (
                  <li key={strat.id} className="flex items-start gap-2 bg-stone-900/50 p-2 rounded-lg border border-stone-800/60">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">If</span>
                    <span className="text-stone-300">{strat.ifText}，</span>
                    <span className="text-amber-400 font-bold shrink-0 mt-0.5">Then</span>
                    <span className="text-stone-200 font-medium">{strat.thenText}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500 italic py-2">
                尚未啟用任何策略，可在《個人操作手冊》中勾選啟用。
              </p>
            )}
          </div>

          {/* Active Habits */}
          <div className="bg-stone-950/60 rounded-xl p-3.5 border border-stone-800/70">
            <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🎯 本週短期外掛提問</span>
              <span className="text-[10px] text-stone-500 font-normal">（刻意練習）</span>
            </h4>
            {activeHabits.length > 0 ? (
              <ul className="space-y-2 text-xs text-stone-300">
                {activeHabits.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-2 bg-stone-900/50 p-2 rounded-lg border border-stone-800/60">
                    <div className="w-3.5 h-3.5 rounded border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <span>{habit.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500 italic py-2">
                尚未啟用任何提問，可在《個人操作手冊》中啟用。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 🧭 第一層：狀態檢核：「我今天過得好嗎？」 */}
      <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-6 shadow-xl">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1 block">
            極低阻力的睡前啟動點
          </span>
          <h3 className="text-2xl font-bold text-stone-100 tracking-tight">
            我今天過得好嗎？
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            無論今天如何，都只是一筆幫助系統迭代的寶貴數據。
          </p>
        </div>

        {/* 3 Branch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto mb-8">
          {/* 🟢 好 */}
          <button
            type="button"
            onClick={() => setState('good')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              state === 'good'
                ? 'bg-emerald-950/60 border-emerald-500 text-stone-100 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
                : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-2">
              🟢
            </div>
            <span className="font-bold text-base text-stone-100">好！</span>
            <span className="text-xs text-stone-400 mt-0.5">有成就、順利、能量充沛</span>
            <span className="text-[11px] text-emerald-400/90 mt-2 font-medium bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
              提煉成功配方
            </span>
          </button>

          {/* 🔴 不好 */}
          <button
            type="button"
            onClick={() => setState('bad')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              state === 'bad'
                ? 'bg-rose-950/60 border-rose-500 text-stone-100 ring-2 ring-rose-500/30 shadow-lg shadow-rose-950/50'
                : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl mb-2">
              🔴
            </div>
            <span className="font-bold text-base text-stone-100">不好</span>
            <span className="text-xs text-stone-400 mt-0.5">內耗、受挫、疲憊、卡關</span>
            <span className="text-[11px] text-rose-400/90 mt-2 font-medium bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40">
              解題模式 · 課題分離
            </span>
          </button>

          {/* 🟡 普通 */}
          <button
            type="button"
            onClick={() => setState('normal')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              state === 'normal'
                ? 'bg-amber-950/60 border-amber-500 text-stone-100 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/50'
                : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl mb-2">
              🟡
            </div>
            <span className="font-bold text-base text-stone-100">普通</span>
            <span className="text-xs text-stone-400 mt-0.5">平凡如水、說不上好壞</span>
            <span className="text-[11px] text-amber-400/90 mt-2 font-medium bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
              捕捉微小瞬間
            </span>
          </button>
        </div>

        {/* Dynamic Form Sections */}
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* 🟢 IF GOOD */}
          {state === 'good' && (
            <div className="space-y-4 bg-emerald-950/20 border border-emerald-900/40 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <span>🟢 狀態：好 — 轉化為可複製的成功配方</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  1. 好在哪裡？ <span className="text-stone-500">（今天完成了什麼？有什麼值得開心的事？）</span>
                </label>
                <textarea
                  rows={2}
                  value={goodWhere}
                  onChange={(e) => setGoodWhere(e.target.value)}
                  placeholder="例如：今天工作效率極高，提早下班，還去公園慢跑了 30 分鐘..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-300">
                    2. 如何保持 / 我的成功配方是什麼？
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{isAiLoading ? 'AI 分析中...' : '大腦累了？讓 AI 提煉配方'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={goodKeep}
                  onChange={(e) => setGoodKeep(e.target.value)}
                  placeholder="例如：昨晚睡滿 7.5 小時，且早上先吃了蛋白質豐富的早餐。➡️ 知識庫提煉：睡眠+蛋白質=高效率"
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {/* 🔴 IF BAD */}
          {state === 'bad' && (
            <div className="space-y-4 bg-rose-950/20 border border-rose-900/40 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <span>🔴 狀態：不好 — 切斷情緒內耗，進入「解題模式」</span>
                </div>
                <span className="text-[11px] bg-rose-950/80 text-rose-300 px-2.5 py-0.5 rounded border border-rose-800/50">
                  💡 區分「客觀事實」與「主觀情緒」
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                    <span>1. 不好在哪裡？（客觀事實）</span>
                    <span className="text-[10px] text-stone-500">攝影機鏡頭拍得到的</span>
                  </label>
                  <textarea
                    rows={2}
                    value={badFact}
                    onChange={(e) => setBadFact(e.target.value)}
                    placeholder="例如：下午主管退回了我的提案，要求週五前重做..."
                    className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                    <span>主觀情緒（內心感受）</span>
                    <span className="text-[10px] text-stone-500">我的大腦附加的劇本</span>
                  </label>
                  <textarea
                    rows={2}
                    value={badEmotion}
                    onChange={(e) => setBadEmotion(e.target.value)}
                    placeholder="例如：覺得委屈、丟臉，覺得自己能力很差，很想擺爛..."
                    className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  2. 什麼原因？ <span className="text-stone-500">（客觀找出生活中的 bug，不帶自我批判）</span>
                </label>
                <textarea
                  rows={2}
                  value={badReason}
                  onChange={(e) => setBadReason(e.target.value)}
                  placeholder="例如：提案前沒有先跟主管對焦核心指標，且今天因為太忙沒吃午餐，血糖低容易情緒失控..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-300">
                    3. 明天有什麼辦法改善？ <span className="text-stone-500">（只要 1% 的微小改變）</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/60 px-2.5 py-1 rounded-lg transition"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{isAiLoading ? 'AI 教練思考中...' : '認知枯竭？讓 AI 教練給予 If-Then 解法'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={badImprove}
                  onChange={(e) => setBadImprove(e.target.value)}
                  placeholder="例如：If 明天做提案前，Then 先花 5 分鐘寫大綱跟主管口頭確認。If 餓了，Then 先吃顆茶葉蛋。"
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>
          )}

          {/* 🟡 IF NORMAL */}
          {state === 'normal' && (
            <div className="space-y-4 bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <span>🟡 狀態：普通 — 在平凡如水中捕捉順利與平靜</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  1. 今天有哪個微小的瞬間，讓我感覺平靜或順利？
                </label>
                <textarea
                  rows={2}
                  value={normalMoment}
                  onChange={(e) => setNormalMoment(e.target.value)}
                  placeholder="例如：下班路上微風吹過來很舒服 / 今天的晚餐很熱很香 / 捷運剛好有位子坐..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-300">
                    2. 如何把這個瞬間放大或複製？
                  </label>
                  <button
                    type="button"
                    onClick={handleCallAICoach}
                    disabled={isAiLoading}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium bg-amber-950/80 hover:bg-amber-900/80 border border-amber-800/60 px-2.5 py-1 rounded-lg transition"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{isAiLoading ? 'AI 構思中...' : '讓 AI 設計微小放大儀式'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={normalAmplify}
                  onChange={(e) => setNormalAmplify(e.target.value)}
                  placeholder="例如：把那首歌加入放鬆歌單 / 明天下班也在那個站下車散步 10 分鐘..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          )}

          {/* 🤖 AI 認知副處理器建議結果卡片 (Cognitive Co-processor Result Card) */}
          {aiAdvice && (
            <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-stone-100 text-sm">
                    🤖 AI 認知副處理器 · 解法與心理洞察
                  </h4>
                </div>
                <span className="text-xs text-stone-400">
                  基於阿德勒課題分離 & 福格微小行為
                </span>
              </div>

              {/* Psychological Insight */}
              <div className="bg-stone-800/40 border border-stone-700/50 rounded-xl p-3 text-xs text-stone-300 mb-3.5 leading-relaxed">
                <span className="text-emerald-400 font-semibold block mb-1">
                  💡 心理學與思維拆解：
                </span>
                {aiAdvice.psychologicalInsight}
              </div>

              {/* Strategies */}
              <div className="space-y-2 mb-4">
                <div className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                  <span>⚡ 建議採用的 If-Then 行為策略：</span>
                  <span className="text-[11px] text-stone-500 font-normal">
                    點擊「採用」填入筆記，或「加入手冊」隔天自動投影
                  </span>
                </div>
                {aiAdvice.strategies.map((strat, idx) => (
                  <div 
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-stone-950/80 p-3 rounded-xl border border-stone-800 text-xs"
                  >
                    <span className="text-stone-200 font-mono leading-relaxed">{strat}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdoptStrategy(strat)}
                        className="px-2.5 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/50 rounded-lg transition"
                      >
                        採用填入
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToPersonalOS(strat)}
                        className="px-2.5 py-1 bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700 rounded-lg transition flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3 text-emerald-400" />
                        <span>加入手冊</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {strategyAdded && (
                <div className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 p-2 rounded-lg flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>已成功將策略「{strategyAdded}」加入《個人操作手冊》，明天晨間自動防禦！</span>
                </div>
              )}

              {/* Encouragement */}
              {aiAdvice.encouragement && (
                <div className="text-xs text-stone-400 italic border-t border-stone-800/80 pt-2.5 flex items-center gap-2">
                  <span className="text-emerald-400">“</span>
                  <span>{aiAdvice.encouragement}</span>
                </div>
              )}
            </div>
          )}

          {/* 🏷️ 標籤與雙向連結 (Tags & Backlinks) */}
          <div className="bg-stone-950/40 border border-stone-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
              <span>🏷️ 今日標籤 (Tags) 與 雙向連結 (Backlinks)</span>
              <span className="text-[10px] text-stone-500 font-normal">（建構知識庫與關係網的核心）</span>
            </h4>

            {/* Tags Selection */}
            <div>
              <span className="text-xs text-stone-400 block mb-2">常用標籤 #：</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {commonTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition ${
                        isSelected
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 font-medium'
                          : 'bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800'
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
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Backlinks [[ ]] Selection */}
            <div>
              <span className="text-xs text-stone-400 block mb-2">關鍵因素雙向連結 [[ ]]：</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {commonFactors.map(factor => {
                  const isSelected = selectedFactors.includes(factor);
                  return (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => toggleFactor(factor)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition ${
                        isSelected
                          ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50 font-medium'
                          : 'bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800'
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
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-sm shadow-lg shadow-emerald-950/60 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>儲存今日日誌</span>
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
                  <Check className="w-3.5 h-3.5" /> 已記錄歸檔
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs border border-stone-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製 Obsidian 格式' : '複製 Obsidian MD'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs border border-stone-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下載 .md</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
