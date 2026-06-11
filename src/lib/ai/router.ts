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

export async function routeCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  ruleBasedFallback: () => string | Promise<string>
): Promise<CompletionResult> {
  if (isOpenAIConfigured()) {
    try {
      const content = await openaiChat(systemPrompt, messages);
      return { content, provider: "openai" };
    } catch (error) {
      console.warn("OpenAI completion failed, trying fallback:", error);
    }
  }

  if (isGeminiConfigured()) {
    try {
      const content = await geminiChat(systemPrompt, messages);
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
