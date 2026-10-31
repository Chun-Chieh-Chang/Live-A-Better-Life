import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google Gen AI client
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

// API: AI Coach Cognitive Co-processor endpoint
app.post('/api/coach', async (req, res) => {
  try {
    const { state, data, personalOS, customPrompt } = req.body;

    const systemPrompt = `你是一個溫暖、敏銳且務實的「AI 認知副處理器（Cognitive Co-processor）」與生活教練。
你的任務是協助在下班或睡前處於「認知疲憊（Ego Depletion）」狀態的使用者，為他們的每日復盤尋找解法。

【核心原則】
1. 極低啟動門檻：絕不提出宏大、耗損意志力的目標（例如「每天慢跑一小時」），只給出如「把運動鞋放在玄關」、「睡前把手機放客廳」等阻力接近零的微小行為設計（福格行為模型 Tiny Habits）。
2. If-Then 語法：改善策略或維持策略必須盡量採用「If [明確的觸發情境/時間點], Then [立即執行的微小動作]」句型。
3. 阿德勒心理學（課題分離）：引導使用者區分「別人的課題/老天的課題（無法控制）」與「我的課題（能控制的反饋）」，將挫折視為「系統優化的數據」，而非個人的「失敗」。
4. 格式清晰：直接給出 2~3 個可立刻打勾執行的策略列表，以及 1 句簡短的心理拆解。繁體中文回應。`;

    const userPrompt = `
當前使用者反省狀態：${state === 'good' ? '🟢 好' : state === 'bad' ? '🔴 不好' : '🟡 普通'}
填寫內容：
- 好在哪裡：${data.goodWhere || '無'}
- 如何保持/成功配方（待分析）：${data.goodKeep || '待 AI 建議...'}
- 不好在哪裡（客觀事實）：${data.badFact || '無'}
- 不好在哪裡（主觀情緒）：${data.badEmotion || '無'}
- 什麼原因：${data.badReason || '無'}
- 明天改善辦法（待分析）：${data.badImprove || '待 AI 建議...'}
- 微小平靜瞬間：${data.normalMoment || '無'}
- 如何放大這個瞬間（待分析）：${data.normalAmplify || '待 AI 建議...'}
- 關鍵標籤/因素：${data.tags || ''} / ${data.factors || ''}

使用者的個人操作手冊（知識庫背景）：
- 本週 If-Then 策略：${JSON.stringify(personalOS?.ifThenStrategies || [])}
- 快樂與急救配方：${JSON.stringify(personalOS?.emergencyRecipes || [])}
- 避坑指南：${JSON.stringify(personalOS?.avoidanceGuides || [])}

${customPrompt ? `額外提問/需求：${customPrompt}` : ''}

請為使用者生成具體的建議。請以 JSON 格式回應，包含以下欄位：
{
  "strategies": ["If ... Then ...", "If ... Then ...", "If ... Then ..."],
  "psychologicalInsight": "針對今天情況的溫暖拆解（課題分離/情緒與事實剖析）",
  "suggestedTag": "建議添加的雙向連結或標籤，如 [[喝水]] 或 #課題分離",
  "encouragement": "一句溫暖、同理、給予力量的話語"
}
`;

    if (aiClient && apiKey) {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, result: parsed });
      } catch (parseError) {
        return res.json({
          success: true,
          result: {
            strategies: [
              `If 遇到類似狀況， Then 先深呼吸 3 秒並喝一口溫水。`,
              `If 感到疲憊， Then 給自己 10 分鐘完全不看螢幕的空白時間。`
            ],
            psychologicalInsight: responseText.slice(0, 200),
            suggestedTag: `[[日常覺察]]`,
            encouragement: '把今天當作一筆寶貴的數據，你已經在掌控自己的生活了。'
          }
        });
      }
    } else {
      // Intelligent fallback when GEMINI_API_KEY is not configured yet
      const fallbackResult = generateFallbackCoachAdvice(state, data);
      return res.json({ success: true, result: fallbackResult, isFallback: true });
    }
  } catch (err: any) {
    console.error('Error in /api/coach:', err);
    const fallback = generateFallbackCoachAdvice(req.body.state, req.body.data);
    return res.json({ success: true, result: fallback, isFallback: true, error: err.message });
  }
});

// Fallback coach generator based on behavioral design & transcript logic
function generateFallbackCoachAdvice(state: string, data: any) {
  if (state === 'bad') {
    const fact = data?.badFact || '遇到的突發狀況';
    return {
      strategies: [
        `If 明天感覺到煩躁或壓力升起， Then 先停頓 5 秒，對自己說「這是對方的課題，我只專注能控制的事」。`,
        `If 遇到難題或被催促， Then 先拿起手邊的水杯喝一口水，延遲自動化的情緒反應。`,
        `If 下班後感到情緒殘留， Then 走一條沒走過的小路散步 10 分鐘，作為切斷工作模式的物理儀式。`
      ],
      psychologicalInsight: `【事實與情緒拆解】事實往往只是「${fact}」，而情緒是我們大腦對事實附加的劇本。利用阿德勒的課題分離，將外界的反饋當作產品測試數據，不用上升到自我批判。`,
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

// Dev vs Prod Vite setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Life OS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
