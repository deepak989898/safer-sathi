import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "./openai";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  return genAI.getGenerativeModel({ model: modelName });
}

export async function chatCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: { temperature?: number }
): Promise<string> {
  const model = getModel();
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    throw new Error("At least one message is required");
  }

  const chat = model.startChat({
    history,
    generationConfig: { temperature: options?.temperature ?? 0.7 },
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(lastMessage.content);
  const content = result.response.text();
  if (!content) {
    throw new Error("Gemini returned empty response");
  }
  return content;
}
