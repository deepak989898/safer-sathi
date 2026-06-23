import { z } from "zod";
import { runMarketVehicleAgent } from "@/lib/ai/agents/market-vehicle-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(2).optional(),
  type: z
    .enum(["car", "suv", "luxury", "tempo_traveller", "mini_bus", "bus"])
    .optional(),
  location: z.string().min(2).optional(),
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

    const result = await runMarketVehicleAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Market vehicle agent error:", err);
    return apiError("Failed to generate market vehicle", 500);
  }
}
