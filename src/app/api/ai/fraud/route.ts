import { z } from "zod";
import { runFraudAgent } from "@/lib/ai/agents/fraud-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  amount: z.number().positive(),
  serviceType: z.string().min(1),
  paymentMethod: z.string().optional(),
  ipAddress: z.string().optional(),
  bookingCount24h: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runFraudAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Fraud agent error:", err);
    return apiError("Failed to run fraud check", 500);
  }
}
