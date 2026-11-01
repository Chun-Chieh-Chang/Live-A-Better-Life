import { GoogleGenAI } from "@google/genai";
export interface GenerateRequest {
  model: string;
  contents: string;
  config?: {
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
    httpOptions?: { timeout?: number; retryOptions?: { attempts?: number } };
  };
}
export interface AIClient {
  models: {
    generateContent: (request: GenerateRequest) => Promise<{ text?: string }>;
  };
}
export type AIProvider = "agnes" | "gemini";
export const AI_DEFAULTS = {
  agnes: {
    model: "agnes-3.0-flash",
    baseURL: "https://apihub.agnes-ai.com/v1",
  },
  gemini: { model: "gemini-3.8-flash" },
} as const;
export function createAgnesClient({
  apiKey,
  fetchImpl = fetch,
}: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): AIClient {
  return {
    models: {
      async generateContent(request) {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          request.config?.httpOptions?.timeout ?? 10000,
        );
        try {
          const response = await fetchImpl(
            AI_DEFAULTS.agnes.baseURL + "/chat/completions",
            {
              method: "POST",
              redirect: "error",
              signal: controller.signal,
              headers: {
                Authorization: "Bearer " + apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: request.model,
                messages: [{ role: "user", content: request.contents }],
                max_tokens: request.config?.maxOutputTokens ?? 2000,
                temperature: request.config?.temperature ?? 0.7,
                stream: false,
              }),
            },
          );
          if (!response.ok) throw new Error("AI request rejected");
          const body = await response.json();
          const text = body?.choices?.[0]?.message?.content;
          if (typeof text !== "string" || !text.trim() || text.length > 100000)
            throw new Error("Invalid AI response");
          return { text };
        } catch {
          throw new Error("AI request unavailable");
        } finally {
          clearTimeout(timer);
        }
      },
    },
  };
}
export function selectAI(env: NodeJS.ProcessEnv = process.env): {
  client: AIClient | null;
  provider: AIProvider;
  model: string;
} {
  const preference = env.AI_PROVIDER || "auto";
  if (!["auto", "agnes", "gemini"].includes(preference))
    throw new Error("Unsupported AI provider");
  const agnesKey = env.AGNES_API_KEY?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();
  const provider: AIProvider =
    preference === "agnes" || (preference === "auto" && !!agnesKey)
      ? "agnes"
      : "gemini";
  if (provider === "agnes")
    return {
      client: agnesKey ? createAgnesClient({ apiKey: agnesKey }) : null,
      provider,
      model: env.AGNES_MODEL || AI_DEFAULTS.agnes.model,
    };
  return {
    client:
      geminiKey && geminiKey !== "MY_GEMINI_API_KEY"
        ? new GoogleGenAI({ apiKey: geminiKey })
        : null,
    provider,
    model: env.GEMINI_MODEL || AI_DEFAULTS.gemini.model,
  };
}
