import { z } from "zod";
import { runMarketHotelAgent } from "@/lib/ai/agents/market-hotel-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  city: z.string().min(2, "City is required"),
  starRating: z.number().int().min(2).max(5).optional(),
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

    const result = await runMarketHotelAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Market hotel agent error:", err);
    return apiError("Failed to generate market hotel", 500);
  }
}
