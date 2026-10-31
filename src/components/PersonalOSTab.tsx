import React, { useState } from 'react';
import { PersonalOS, IfThenStrategy, HabitQuestion, EmergencyRecipe, AvoidanceGuide } from '../types';
import { generatePersonalOSMarkdown, downloadFile } from '../utils/markdownExporter';
import { 
  Zap, 
  Target, 
  Heart, 
  AlertOctagon, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  Download, 
  BookOpen
} from 'lucide-react';

interface PersonalOSTabProps {
  personalOS: PersonalOS;
  onUpdatePersonalOS: (updated: PersonalOS) => void;
}

export const PersonalOSTab: React.FC<PersonalOSTabProps> = ({ personalOS, onUpdatePersonalOS }) => {
  const [copied, setCopied] = useState(false);

  // Modal / Input states
  const [newIf, setNewIf] = useState('');
  const [newThen, setNewThen] = useState('');
  const [newHabit, setNewHabit] = useState('');
  
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeDesc, setNewRecipeDesc] = useState('');
  const [newRecipeTag, setNewRecipeTag] = useState('#快樂配方');

  const [newAvoidTitle, setNewAvoidTitle] = useState('');
  const [newAvoidLesson, setNewAvoidLesson] = useState('');
  const [newAvoidTag, setNewAvoidTag] = useState('#避坑指南');

  // Toggle If-Then active state
  const toggleIfThenActive = (id: string) => {
    const updated = personalOS.ifThenStrategies.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    );
    onUpdatePersonalOS({ ...personalOS, ifThenStrategies: updated });
  };

  const deleteIfThen = (id: string) => {
    const updated = personalOS.ifThenStrategies.filter(s => s.id !== id);
    onUpdatePersonalOS({ ...personalOS, ifThenStrategies: updated });
  };

  const addIfThen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIf.trim() || !newThen.trim()) return;
    const newStrategy: IfThenStrategy = {
      id: `strat-${Date.now()}`,
      ifText: newIf.trim(),
      thenText: newThen.trim(),
      active: true,
      category: 'life',
      sourceDate: new Date().toISOString().split('T')[0]
    };
    onUpdatePersonalOS({
      ...personalOS,
      ifThenStrategies: [newStrategy, ...personalOS.ifThenStrategies]
    });
    setNewIf('');
    setNewThen('');
  };

  // Habit questions
  const toggleHabitActive = (id: string) => {
    const updated = personalOS.habitQuestions.map(h => 
      h.id === id ? { ...h, active: !h.active } : h
    );
    onUpdatePersonalOS({ ...personalOS, habitQuestions: updated });
  };

  const deleteHabit = (id: string) => {
    const updated = personalOS.habitQuestions.filter(h => h.id !== id);
    onUpdatePersonalOS({ ...personalOS, habitQuestions: updated });
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    const newH: HabitQuestion = {
      id: `habit-${Date.now()}`,
      text: newHabit.trim(),
      active: true
    };
    onUpdatePersonalOS({
      ...personalOS,
      habitQuestions: [...personalOS.habitQuestions, newH]
    });
    setNewHabit('');
  };

  // Emergency recipes
  const addRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeTitle.trim() || !newRecipeDesc.trim()) return;
    const r: EmergencyRecipe = {
      id: `recipe-${Date.now()}`,
      title: newRecipeTitle.trim(),
      description: newRecipeDesc.trim(),
      tag: newRecipeTag.trim() || '#快樂配方'
    };
    onUpdatePersonalOS({
      ...personalOS,
      emergencyRecipes: [r, ...personalOS.emergencyRecipes]
    });
    setNewRecipeTitle('');
    setNewRecipeDesc('');
  };

  const deleteRecipe = (id: string) => {
    const updated = personalOS.emergencyRecipes.filter(r => r.id !== id);
    onUpdatePersonalOS({ ...personalOS, emergencyRecipes: updated });
  };

  // Avoidance guides
  const addAvoidance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvoidTitle.trim() || !newAvoidLesson.trim()) return;
    const a: AvoidanceGuide = {
      id: `avoid-${Date.now()}`,
      title: newAvoidTitle.trim(),
      lesson: newAvoidLesson.trim(),
      tag: newAvoidTag.trim() || '#避坑指南'
    };
    onUpdatePersonalOS({
      ...personalOS,
      avoidanceGuides: [a, ...personalOS.avoidanceGuides]
    });
    setNewAvoidTitle('');
    setNewAvoidLesson('');
  };

  const deleteAvoidance = (id: string) => {
    const updated = personalOS.avoidanceGuides.filter(a => a.id !== id);
    onUpdatePersonalOS({ ...personalOS, avoidanceGuides: updated });
  };

  const handleCopyMarkdown = () => {
    const md = generatePersonalOSMarkdown(personalOS);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const md = generatePersonalOSMarkdown(personalOS);
    downloadFile('個人操作手冊.md', md);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm shadow-sky-900/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-50 text-[#0084ff]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#09223b]">
              個人操作手冊 (Personal Operating System)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            這是這套閉環系統的「大腦中樞」。每週復盤時提煉出的有效解法與血淚經驗，
            會自動投影回明天的日記與晨間防禦中，不再重複踩坑，打造專屬的生活操作手冊。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-[#0070ba] font-semibold text-xs border border-sky-200 transition shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0084ff]" />}
            <span>{copied ? '已複製手冊 MD' : '複製 Obsidian MD'}</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 font-medium text-xs border border-sky-200 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>下載 .md</span>
          </button>
        </div>
      </div>

      {/* Grid: 4 Pillars of Personal OS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. ⚡ 本週 If-Then 策略 */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#09223b] text-sm">
                  ⚡ 本週 If-Then 策略
                </h3>
                <p className="text-[11px] text-slate-400">
                  勾選的項目會自動投影至每日晨間日誌中（日間即時干預）
                </p>
              </div>
            </div>
            <span className="text-xs text-[#0070ba] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-semibold">
              {personalOS.ifThenStrategies.filter(s => s.active).length} 啟用中
            </span>
          </div>

          {/* Add form */}
          <form onSubmit={addIfThen} className="space-y-2 bg-[#f8fafc] p-3.5 rounded-xl border border-sky-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="If [觸發情境，例如：開會被打斷]"
                value={newIf}
                onChange={(e) => setNewIf(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
              <input
                type="text"
                placeholder="Then [微小行動，例如：先喝口水再回應]"
                value={newThen}
                onChange={(e) => setNewThen(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-sky-50 hover:bg-sky-100 text-[#0070ba] border border-sky-200 rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增 If-Then 策略</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {personalOS.ifThenStrategies.map((strat) => (
              <div
                key={strat.id}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-[#f8fafc] border border-sky-100 hover:border-sky-300 transition text-xs shadow-2xs"
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={strat.active}
                    onChange={() => toggleIfThenActive(strat.id)}
                    className="mt-1 rounded border-sky-300 text-[#0084ff] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <div className="leading-relaxed">
                      <span className="text-[#0084ff] font-extrabold">If</span>{' '}
                      <span className="text-slate-700">{strat.ifText}，</span>{' '}
                      <span className="text-amber-600 font-extrabold">Then</span>{' '}
                      <span className="text-[#09223b] font-bold">{strat.thenText}</span>
                    </div>
                    {strat.sourceDate && (
                      <span className="text-[10px] text-slate-400 block mt-1">
                        提煉於：{strat.sourceDate}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteIfThen(strat.id)}
                  className="text-slate-400 hover:text-rose-600 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 🎯 本週短期外掛提問 */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#09223b] text-sm">
                  🎯 本週短期外掛提問
                </h3>
                <p className="text-[11px] text-slate-400">
                  針對反覆出現的 bug，進行為期 1~2 週的刻意練習
                </p>
              </div>
            </div>
            <span className="text-xs text-[#0070ba] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-semibold">
              {personalOS.habitQuestions.filter(h => h.active).length} 啟用中
            </span>
          </div>

          {/* Add form */}
          <form onSubmit={addHabit} className="flex gap-2 bg-[#f8fafc] p-3.5 rounded-xl border border-sky-100">
            <input
              type="text"
              placeholder="例如：我今天有在 12 點前放下手機睡覺嗎？"
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              className="flex-1 bg-white border border-sky-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-[#0084ff] hover:bg-[#0073e6] text-white font-bold rounded-lg text-xs transition shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {personalOS.habitQuestions.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f8fafc] border border-sky-100 hover:border-sky-300 transition text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={habit.active}
                    onChange={() => toggleHabitActive(habit.id)}
                    className="rounded border-sky-300 text-[#0084ff] focus:ring-0 cursor-pointer"
                  />
                  <span className={`${habit.active ? 'text-[#09223b] font-semibold' : 'text-slate-400 line-through'}`}>
                    {habit.text}
                  </span>
                </div>

                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="text-slate-400 hover:text-rose-600 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 🎁 我的快樂與急救配方庫 */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#09223b] text-sm">
                  🎁 我的快樂與急救配方庫
                </h3>
                <p className="text-[11px] text-slate-400">
                  來自🟢好日子的提煉，遇到情緒低潮時 100% 能回血的動作
                </p>
              </div>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              {personalOS.emergencyRecipes.length} 項配方
            </span>
          </div>

          {/* Add form */}
          <form onSubmit={addRecipe} className="space-y-2 bg-[#f8fafc] p-3.5 rounded-xl border border-sky-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="配方名稱（如：睡滿 8 小時）"
                value={newRecipeTitle}
                onChange={(e) => setNewRecipeTitle(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
              <input
                type="text"
                placeholder="標籤（如：#睡眠品質）"
                value={newRecipeTag}
                onChange={(e) => setNewRecipeTag(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
            </div>
            <input
              type="text"
              placeholder="說明/操作方法（如：睡前泡腳，開除濕機...）"
              value={newRecipeDesc}
              onChange={(e) => setNewRecipeDesc(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增急救配方</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {personalOS.emergencyRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="p-3.5 rounded-xl bg-[#f8fafc] border border-sky-100 hover:border-emerald-300 transition text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#09223b]">{recipe.title}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                      {recipe.tag}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRecipe(recipe.id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  {recipe.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 💣 我的避坑指南 */}
        <div className="bg-white rounded-2xl border border-sky-100 p-6 space-y-4 shadow-sm shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-sky-50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#09223b] text-sm">
                  💣 我的避坑指南
                </h3>
                <p className="text-[11px] text-slate-400">
                  來自🔴壞日子的血淚教訓，避免重蹈覆轍
                </p>
              </div>
            </div>
            <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full font-semibold">
              {personalOS.avoidanceGuides.length} 條指南
            </span>
          </div>

          {/* Add form */}
          <form onSubmit={addAvoidance} className="space-y-2 bg-[#f8fafc] p-3.5 rounded-xl border border-sky-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="雷區名稱（如：肚子餓時不開會）"
                value={newAvoidTitle}
                onChange={(e) => setNewAvoidTitle(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
              <input
                type="text"
                placeholder="標籤（如：#生理防禦）"
                value={newAvoidTag}
                onChange={(e) => setNewAvoidTag(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
              />
            </div>
            <input
              type="text"
              placeholder="教訓說明（如：血糖低時大腦缺乏葡萄糖，極易失控...）"
              value={newAvoidLesson}
              onChange={(e) => setNewAvoidLesson(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084ff]"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增避坑項目</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {personalOS.avoidanceGuides.map((avoid) => (
              <div
                key={avoid.id}
                className="p-3.5 rounded-xl bg-[#f8fafc] border border-sky-100 hover:border-rose-300 transition text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#09223b]">{avoid.title}</span>
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-medium">
                      {avoid.tag}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteAvoidance(avoid.id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  {avoid.lesson}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
