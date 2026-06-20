import { runVoiceConversation } from "@/lib/ai-center/voice-conversation-engine";
import type { VoiceConversationState } from "@/lib/ai-center/voice-conversation-engine";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  message: z.string(),
  state: z
    .object({
      step: z.string(),
      locale: z.enum(["en", "hi"]),
    })
    .passthrough()
    .optional(),
  locale: z.enum(["en", "hi", "auto"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const initialState: VoiceConversationState = (parsed.data.state as VoiceConversationState) ?? {
      step: "greeting",
      locale: parsed.data.locale === "hi" ? "hi" : parsed.data.locale === "en" ? "en" : "en",
    };

    const result = await runVoiceConversation(parsed.data.message, initialState);
    return apiSuccess(result);
  } catch (err) {
    console.error("Voice assistant error:", err);
    return apiError(err instanceof Error ? err.message : "Voice assistant failed", 500);
  }
}
