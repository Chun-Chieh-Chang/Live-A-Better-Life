import { apiFetch } from '../utils/api';
import { DayState, PersonalOS } from '../types';
import { isCoachResult } from '../utils/validation';

export interface CoachRequestData {
  goodWhere?: string;
  goodKeep?: string;
  badFact?: string;
  badEmotion?: string;
  badReason?: string;
  badImprove?: string;
  normalMoment?: string;
  normalAmplify?: string;
  tags?: string;
  factors?: string;
}

export interface CoachResponseResult {
  strategies: string[];
  psychologicalInsight: string;
  suggestedTag?: string;
  encouragement?: string;
}

export async function askAICoach(
  state: DayState,
  data: CoachRequestData,
  personalOS: PersonalOS,
  customPrompt?: string,
  signal?: AbortSignal
): Promise<{ result: CoachResponseResult; isFallback: boolean; source: 'agnes' | 'gemini' | 'server-fallback' | 'local-fallback' }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once:true});
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 12000);
  try {
    const response = await apiFetch('/api/coach', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state,
        data,
        personalOS,
        customPrompt
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const json = await response.json();
    if (json.success !== true || !isCoachResult(json.result) || typeof json.isFallback !== 'boolean') throw new Error('Invalid coach response');
    if (json.source !== undefined && !['agnes','gemini','server-fallback'].includes(json.source)) throw new Error('Invalid coach source');
    return {result:json.result, isFallback:json.isFallback, source:json.isFallback ? 'server-fallback' : json.source === 'agnes' ? 'agnes' : 'gemini'};
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    // Local fallback heuristic
    return {
      result: getLocalFallbackAdvice(state, data),
      isFallback: true,
      source: 'local-fallback'
    };
  } finally {clearTimeout(timer); signal?.removeEventListener('abort', abort);}
}

function getLocalFallbackAdvice(state: DayState, data: CoachRequestData): CoachResponseResult {
  if (state === 'bad') {
    return {
      strategies: [
        `If 明天感覺到煩躁或壓力升起， Then 先停頓 5 秒，對自己說「這是對方的課題，我只專注能控制的事」。`,
        `If 遇到難題或被急促催促， Then 先拿起手邊的水杯喝一口水，延遲自動化的情緒反應。`,
        `If 下班後感到情緒殘留， Then 走一條沒走過的小路散步 10 分鐘，作為切斷工作模式的物理儀式。`
      ],
      psychologicalInsight: `【事實與情緒拆解】事實往往只是「${data.badFact || '遇到的突發狀況'}」，而情緒是大腦對事實附加的劇本。利用阿德勒的課題分離，將外界的反饋當作產品測試數據，不用上升到自我批判。`,
      suggestedTag: `[[課題分離]] #情緒煞車`,
      encouragement: `感到沮喪是正常的，接納這個低谷。今天這筆數據已經幫你在未來的路上排除了一個隱形的地雷！`
    };
  } else if (state === 'good') {
    return {
      strategies: [
        `If 明天早上醒來， Then 複製今天的晨間節奏，先做這件讓你開心的事。`,
        `If 下次感覺精力充沛， Then 立即記下「當時吃了什麼、睡了多久」，讓成功配方更有依據。`,
        `If 晚上睡前， Then 在心裡再次重溫今天這個美好的畫面 30 秒。`
      ],
      psychologicalInsight: `好日子不是偶然的運氣，而是好習慣與心理安頓的副產品。你已經找到了能滋養自己的開關，值得為自己鼓掌！`,
      suggestedTag: `[[成功配方]] #能量充電`,
      encouragement: `太棒了！今天儲存的這份愉悅感，就是你人生急救箱裡最好的養分。`
    };
  } else {
    return {
      strategies: [
        `If 明天想找回平靜， Then 固定在相同時間（如通勤或午休）保留 10 分鐘專屬放空時段。`,
        `If 遇到微小順利的瞬間， Then 在心裡給自己比一個讚，啟動多巴胺正向迴路。`,
        `If 平凡日子感到重複， Then 換一家便利商店買咖啡，用微小的新鮮感打破慣性。`
      ],
      psychologicalInsight: `平淡佔了人生的六成，正是平靜的基底支撐著我們的穩定。能在平凡如水中捕捉到那一絲順利，代表你的感知力正在提升。`,
      suggestedTag: `[[微小瞬間]] #正念當下`,
      encouragement: `平凡而平靜的一天，本身就是一種莫大的幸運。安心休息吧！`
    };
  }
}
