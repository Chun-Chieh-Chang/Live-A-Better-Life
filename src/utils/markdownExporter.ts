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

export type OsList = 'ifThenStrategies' | 'habitQuestions' | 'emergencyRecipes' | 'avoidanceGuides';
export type OsItem = { id?: string; fields: Record<string, string> };
export type OsFields = Record<OsList, OsItem[]>;

// Single source of truth for the manual note: which lists exist, their plain-language names, and their editable fields.
export const OS_LISTS: Record<OsList, { title: string; fields: Record<string, string> }> = {
  ifThenStrategies: { title: '每週策略', fields: { ifText: '如果', thenText: '就', active: '啟用' } },
  habitQuestions: { title: '短期提問', fields: { text: '內容', active: '啟用' } },
  emergencyRecipes: { title: '急救配方', fields: { title: '標題', description: '內容', tag: '標籤' } },
  avoidanceGuides: { title: '避坑指南', fields: { title: '標題', lesson: '教訓', tag: '標籤' } },
};
const OS_HEADERS: Record<OsList, string> = {
  ifThenStrategies: '## ⚡ 本週 If-Then 策略',
  habitQuestions: '## 🎯 本週短期外掛提問',
  emergencyRecipes: '## 🎁 我的快樂與急救配方庫',
  avoidanceGuides: '## 💣 我的避坑指南',
};
const OS_PLACEHOLDERS = new Set(['- [ ] 尚未新增策略', '- [ ] 尚未新增外掛提問']);

/** Plain-text view of the editable fields of the manual, keyed by item id (used as the sync baseline). */
export function personalOSFields(os: PersonalOS): OsFields {
  const take = (list: OsList, items: any[]): OsItem[] =>
    items.map((item) => ({
      id: item.id,
      fields: Object.fromEntries(Object.keys(OS_LISTS[list].fields).map((k) => [k, typeof item[k] === 'boolean' ? String(item[k]) : String(item[k] ?? '').trim()])),
    }));
  return {
    ifThenStrategies: take('ifThenStrategies', os.ifThenStrategies),
    habitQuestions: take('habitQuestions', os.habitQuestions),
    emergencyRecipes: take('emergencyRecipes', os.emergencyRecipes),
    avoidanceGuides: take('avoidanceGuides', os.avoidanceGuides),
  };
}

/** Reads the manual note back. Items without an id marker are new; returns null when the structure cannot be read. */
export function parsePersonalOSNote(markdown: string): OsFields | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const result: OsFields = { ifThenStrategies: [], habitQuestions: [], emergencyRecipes: [], avoidanceGuides: [] };
  const split = (line: string): { text: string; id?: string } | null => {
    const m = / <!-- id:([^ >]+) -->\s*$/.exec(line);
    if (!m) return { text: line.trimEnd() };
    try { return { text: line.slice(0, m.index), id: decodeURIComponent(m[1]) }; } catch { return null; }
  };
  let list: OsList | null = null;
  let block: OsItem | null = null;
  const description: Record<string, string> = { emergencyRecipes: 'description', avoidanceGuides: 'lesson' };
  const body: string[] = [];
  const closeBlock = () => {
    if (block && list) block.fields[description[list]] = body.join('\n').trim();
    block = null;
    body.length = 0;
  };
  let seen = 0;
  for (const line of lines) {
    const header = (Object.keys(OS_HEADERS) as OsList[]).find((k) => line.trimEnd() === OS_HEADERS[k]);
    if (header) { closeBlock(); list = header; seen++; continue; }
    if (line.startsWith('## ')) { closeBlock(); list = null; continue; }
    if (!list) continue;
    if (list === 'emergencyRecipes' || list === 'avoidanceGuides') {
      if (line.startsWith('### ')) {
        closeBlock();
        const parts = split(line);
        if (!parts) return null;
        const m = /^### (.*?)(?: `([^`]*)`)?\s*$/.exec(parts.text);
        if (!m) return null;
        block = { id: parts.id, fields: { title: m[1], tag: m[2] ?? '', [description[list]]: '' } };
        result[list].push(block);
      } else if (block && !/^\*\(.*\)\*$/.test(line)) body.push(line);
      continue;
    }
    if (!line.startsWith('- [')) continue;
    const parts = split(line);
    if (!parts) return null;
    if (!parts.id && OS_PLACEHOLDERS.has(parts.text)) continue;
    const check = /^- \[( |x)\] (.*)$/.exec(parts.text);
    if (!check) continue;
    const active = String(check[1] === 'x');
    if (list === 'habitQuestions') result[list].push({ id: parts.id, fields: { text: check[2].trim(), active } });
    else {
      const at = check[2].indexOf(', Then ');
      const head = /^If (.*)$/.exec(at < 0 ? '' : check[2].slice(0, at));
      if (!head) continue;
      result[list].push({ id: parts.id, fields: { ifText: head[1].trim(), thenText: check[2].slice(at + 7).trim(), active } });
    }
  }
  closeBlock();
  return seen === 4 ? result : null;
}

export function generatePersonalOSMarkdown(personalOS: PersonalOS, withIds = false): string {
  const mark = (id: string) => (withIds ? ` <!-- id:${encodeURIComponent(id)} -->` : '');
  const ifThenContent = personalOS.ifThenStrategies.map(s => 
    `- [${s.active ? 'x' : ' '}] If ${s.ifText}, Then ${s.thenText}${mark(s.id)}`
  ).join('\n');

  const habitsContent = personalOS.habitQuestions.map(h => 
    `- [${h.active ? 'x' : ' '}] ${h.text}${mark(h.id)}`
  ).join('\n');

  const recipesContent = personalOS.emergencyRecipes.map(r => 
    `### ${r.title} ${r.tag ? `\`${r.tag}\`` : ''}${mark(r.id)}\n${r.description}`
  ).join('\n\n');

  const avoidsContent = personalOS.avoidanceGuides.map(a => 
    `### ${a.title} ${a.tag ? `\`${a.tag}\`` : ''}${mark(a.id)}\n${a.lesson}`
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
