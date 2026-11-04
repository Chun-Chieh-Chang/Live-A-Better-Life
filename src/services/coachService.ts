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
): Promise<{ result: CoachResponseResult; isFallback: false; source: 'agnes' | 'gemini' }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, {once:true});
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 65000);
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
    if (json.success !== true || !isCoachResult(json.result) || json.isFallback !== false || !['agnes', 'gemini'].includes(json.source)) throw new Error('Invalid AI response');
    return {result:json.result, isFallback:false, source:json.source};
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    throw new Error('AI 目前無法提供建議，請確認連線後再試。你仍可保存今天的記錄。');
  } finally {clearTimeout(timer); signal?.removeEventListener('abort', abort);}
}
