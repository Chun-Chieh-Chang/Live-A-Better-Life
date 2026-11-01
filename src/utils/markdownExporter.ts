import type { DailyEntry, PersonalOS } from '../types';

export type EditableKey =
  | 'goodWhere' | 'goodKeep'
  | 'badFact' | 'badEmotion' | 'badReason' | 'badImprove'
  | 'normalMoment' | 'normalAmplify';

const AI_PLACEHOLDER = '[ ] 待 AI 教練建議...';
const AI_FIELDS = new Set<EditableKey>(['goodKeep', 'badImprove', 'normalAmplify']);

// Single source of truth for the editable part of a daily note: even indexes are fixed text, odd indexes are entry fields.
const DAILY_LAYOUT: Record<DailyEntry['state'], { segments: string[] }> = {
  good: { segments: ['#### 🟢 狀態：好\n- **好在哪裡？**\n  - ', 'goodWhere', '\n- **如何保持 / 成功配方？**\n  - ', 'goodKeep'] },
  bad: { segments: ['#### 🔴 狀態：不好\n- **不好在哪裡？**\n  - 客觀事實：', 'badFact', '\n  - 主觀情緒：', 'badEmotion', '\n- **什麼原因？**\n  - ', 'badReason', '\n- **明天有什麼辦法改善？**\n  - ', 'badImprove'] },
  normal: { segments: ['#### 🟡 狀態：普通\n- **今天有哪個微小瞬間讓我感覺平靜或順利？**\n  - ', 'normalMoment', '\n- **如何放大這個瞬間？**\n  - ', 'normalAmplify'] },
};

export const FIELD_LABELS: Record<EditableKey, string> = {
  goodWhere: '好在哪裡', goodKeep: '如何保持', badFact: '客觀事實', badEmotion: '主觀情緒',
  badReason: '什麼原因', badImprove: '明天的改善辦法', normalMoment: '平靜或順利的瞬間', normalAmplify: '如何放大',
};

export function editableKeys(state: DailyEntry['state']): EditableKey[] {
  return (DAILY_LAYOUT[state] ?? DAILY_LAYOUT.normal).segments.filter((_, n) => n % 2 === 1) as EditableKey[];
}

/** Reads the editable fields back from a note written by generateDailyNoteMarkdown; returns null if the structure was changed. */
export function parseDailyNoteFields(markdown: string, state: DailyEntry['state']): Partial<Record<EditableKey, string>> | null {
  const text = markdown.replace(/\r\n/g, '\n');
  const segments = (DAILY_LAYOUT[state] ?? DAILY_LAYOUT.normal).segments;
  let cursor = text.indexOf('### 狀態檢核：我今天過得好嗎？\n');
  if (cursor < 0) return null;
  const result: Partial<Record<EditableKey, string>> = {};
  for (let n = 0; n < segments.length; n += 2) {
    const start = text.indexOf(segments[n], cursor);
    if (start < 0) return null;
    const valueStart = start + segments[n].length;
    const key = segments[n + 1] as EditableKey;
    const next = n + 2 < segments.length ? text.indexOf(segments[n + 2], valueStart) : Math.min(...['\n\n> [!tip]', '\n\n---\n### 🏷️'].map((m) => { const k = text.indexOf(m, valueStart); return k < 0 ? Infinity : k; }));
    if (next < 0 || next === Infinity) return null;
    const value = text.slice(valueStart, next).trim();
    result[key] = value === AI_PLACEHOLDER ? '' : value;
    cursor = next;
  }
  return result;
}
export function generateDailyNoteMarkdown(entry: DailyEntry, personalOS: PersonalOS): string {
  // Filter active strategies and habits to transclude
  const activeStrategies = personalOS.ifThenStrategies.filter(s => s.active);
  const activeHabits = personalOS.habitQuestions.filter(h => h.active);

  const ifThenLines = activeStrategies.length > 0
    ? activeStrategies.map(s => `- [ ] If ${s.ifText}, Then ${s.thenText}`).join('\n')
    : '- [ ] 尚未設定本週 If-Then 策略';

  const habitLines = activeHabits.length > 0
    ? activeHabits.map(h => `- [ ] ${h.text}`).join('\n')
    : '- [ ] 尚未設定短期外掛提問';

  const layout = DAILY_LAYOUT[entry.state] ?? DAILY_LAYOUT.normal;
  const statusContent = layout.segments.map((seg, n) => {
    if (n % 2 === 0) return seg;
    const value = entry[seg as EditableKey] || '';
    return value || (AI_FIELDS.has(seg as EditableKey) ? AI_PLACEHOLDER : '');
  }).join('');

  const aiAdviceBlock = entry.aiAdvice ? `
> [!tip] 🤖 AI 認知副處理器建議 (解法提煉)
${entry.aiAdvice.strategies.map(s => `> - [ ] ${s}`).join('\n')}
> 
> *心理視角：${entry.aiAdvice.psychologicalInsight}*
` : '';

  const tagsString = entry.tags.join(' ');
  const factorsString = entry.factors.join(' ');
  const stateTag = entry.state === 'good' ? '#狀態/🟢好' : entry.state === 'bad' ? '#狀態/🔴不好' : '#狀態/🟡普通';

  return `> [!info] 🛡️ 今日防禦與策略 (系統自動回饋)
> ![[我的小改變#⚡ 本週 If-Then 策略]]
${ifThenLines.split('\n').map(l => `> ${l}`).join('\n')}
> 
> ![[我的小改變#🎯 本週短期外掛提問]]
${habitLines.split('\n').map(l => `> ${l}`).join('\n')}

---
### 狀態檢核：我今天過得好嗎？

${statusContent}
${aiAdviceBlock}
---
### 🏷️ 今日標籤與數據
- 狀態標籤： ${stateTag} ${tagsString}
- 關鍵因素： ${factorsString || '[[未標註]]'}
`;
}

export function generateTemplateMarkdown(): string {
  return `> [!info] 🛡️ 今日防禦與策略 (系統自動回饋)
> ![[我的小改變#⚡ 本週 If-Then 策略]]
> ![[我的小改變#🎯 本週短期外掛提問]]

---
### 狀態檢核：我今天過得好嗎？
（填寫指南：請保留今天的真實狀態，刪除另外兩個不適用的區塊）

#### 🟢 狀態：好
- **好在哪裡？**
  - 
- **如何保持 / 成功配方？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

#### 🔴 狀態：不好
- **不好在哪裡？**
  - 客觀事實：
  - 主觀情緒：
- **什麼原因？**
  - 
- **明天有什麼辦法改善？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

#### 🟡 狀態：普通
- **今天有哪個微小瞬間讓我感覺平靜或順利？**
  - 
- **如何放大這個瞬間？** *(如需協助，請保留下方標籤並呼叫 AI)*
  - [ ] 待 AI 教練建議...

---
### 🏷️ 今日標籤與數據
- 狀態標籤： #狀態/ （填入 🟢好、🔴不好 或 🟡普通）
- 關鍵因素： [[ ]]
`;
}

export function generatePersonalOSMarkdown(personalOS: PersonalOS): string {
  const ifThenContent = personalOS.ifThenStrategies.map(s => 
    `- [${s.active ? 'x' : ' '}] If ${s.ifText}, Then ${s.thenText}`
  ).join('\n');

  const habitsContent = personalOS.habitQuestions.map(h => 
    `- [${h.active ? 'x' : ' '}] ${h.text}`
  ).join('\n');

  const recipesContent = personalOS.emergencyRecipes.map(r => 
    `### ${r.title} ${r.tag ? `\`${r.tag}\`` : ''}\n${r.description}`
  ).join('\n\n');

  const avoidsContent = personalOS.avoidanceGuides.map(a => 
    `### ${a.title} ${a.tag ? `\`${a.tag}\`` : ''}\n${a.lesson}`
  ).join('\n\n');

  return `# 📖 我的我的小改變 (Personal Operating System)
*(這是本系統的資料中樞，請於每週日進行復盤與提煉)*

## ⚡ 本週 If-Then 策略
*(將每日反省中「有效的改善辦法」提煉於此，隔天會自動投影到新日誌中)*
${ifThenContent || '- [ ] 尚未新增策略'}

## 🎯 本週短期外掛提問
*(本週想刻意練習的微小習慣，作為晨間防禦機制)*
${habitsContent || '- [ ] 尚未新增外掛提問'}

## 🎁 我的快樂與急救配方庫
*(歷史好日子的成功配方總結)*
${recipesContent || '尚未新增配方'}

## 💣 我的避坑指南
*(歷史壞日子的血淚教訓，避免重蹈覆轍)*
${avoidsContent || '尚未新增避坑項目'}
`;
}

export function downloadFile(filename: string, content: string, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
