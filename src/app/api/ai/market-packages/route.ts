import { z } from "zod";
import { runMarketPackageAgent } from "@/lib/ai/agents/market-package-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  destination: z.string().min(2, "Destination is required"),
  category: z
    .enum([
      "domestic",
      "international",
      "religious",
      "adventure",
      "family",
      "honeymoon",
    ])
    .optional(),
  durationDays: z.number().int().min(3).max(14).optional(),
  locale: z.enum(["en", "hi"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runMarketPackageAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Market package agent error:", err);
    return apiError("Failed to generate market package", 500);
  }
}
