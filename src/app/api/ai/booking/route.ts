import { z } from "zod";
import { runBookingAgent } from "@/lib/ai/agents/booking-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  serviceType: z.enum([
    "package",
    "vehicle",
    "hotel",
    "bus",
    "car_rental",
    "tempo_traveller",
    "airport_pickup",
    "holiday",
  ]),
  serviceId: z.string().min(1),
  serviceName: z.object({ en: z.string(), hi: z.string() }),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  guests: z.number().int().positive(),
  amount: z.number().positive(),
  userId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runBookingAgent(parsed.data);
    return apiSuccess(result, 201);
  } catch (err) {
    console.error("Booking agent error:", err);
    return apiError("Failed to process booking", 500);
  }
}
