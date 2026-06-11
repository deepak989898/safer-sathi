import { z } from "zod";
import { runTravelAgent } from "@/lib/ai/agents/travel-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  message: z.string().min(1, "Message is required"),
  locale: z.enum(["en", "hi"]).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runTravelAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Travel agent error:", err);
    return apiError("Failed to process travel request", 500);
  }
}
