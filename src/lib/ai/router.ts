import { chatCompletion as geminiChat, isGeminiConfigured } from "./gemini";
import {
  chatCompletion as openaiChat,
  isOpenAIConfigured,
  type ChatMessage,
} from "./openai";

export type AIProvider = "openai" | "gemini" | "rule-based";

export interface CompletionResult {
  content: string;
  provider: AIProvider;
}

const DEFAULT_AI_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("AI request timed out")), ms);
    }),
  ]);
}

export async function routeCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  ruleBasedFallback: () => string | Promise<string>,
  options?: { timeoutMs?: number; maxTokens?: number }
): Promise<CompletionResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  const maxTokens = options?.maxTokens ?? 512;

  if (isOpenAIConfigured()) {
    try {
      const content = await withTimeout(
        openaiChat(systemPrompt, messages, { maxTokens }),
        timeoutMs
      );
      return { content, provider: "openai" };
    } catch (error) {
      console.warn("OpenAI completion failed, trying fallback:", error);
    }
  }

  if (isGeminiConfigured()) {
    try {
      const content = await withTimeout(
        geminiChat(systemPrompt, messages),
        timeoutMs
      );
      return { content, provider: "gemini" };
    } catch (error) {
      console.warn("Gemini completion failed, using rule-based fallback:", error);
    }
  }

  const content = await ruleBasedFallback();
  return { content, provider: "rule-based" };
}

export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (isOpenAIConfigured()) providers.push("openai");
  if (isGeminiConfigured()) providers.push("gemini");
  if (providers.length === 0) providers.push("rule-based");
  return providers;
}
