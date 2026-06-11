import { z } from "zod";
import { runMarketingAgent } from "@/lib/ai/agents/marketing-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  topic: z.string().min(1, "Topic is required"),
  contentType: z.enum(["blog", "social", "campaign"]),
  locale: z.enum(["en", "hi"]).optional(),
  platform: z.enum(["instagram", "facebook", "twitter", "linkedin"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runMarketingAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Marketing agent error:", err);
    return apiError("Failed to generate content", 500);
  }
}
