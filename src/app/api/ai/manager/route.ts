import { z } from "zod";
import { runTravelManager } from "@/lib/ai/travel-manager/travel-manager-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const stateSchema = z
  .object({
    step: z.string(),
    intent: z.string(),
    destination: z.string().optional(),
    tripType: z.string().optional(),
    selectedActivities: z.array(z.string()).optional(),
    guests: z.number().optional(),
    budget: z.number().optional(),
    durationDays: z.number().optional(),
    pickupCity: z.string().optional(),
    travelDate: z.string().optional(),
    specialRequest: z.string().optional(),
    hotelBudgetTier: z.string().optional(),
    selectedHotelId: z.string().optional(),
    selectedVehicleId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    bookingId: z.string().optional(),
  })
  .passthrough();

const schema = z.object({
  message: z.string(),
  locale: z.enum(["en", "hi"]).optional(),
  state: stateSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await runTravelManager({
      message: parsed.data.message,
      locale: parsed.data.locale,
      state: parsed.data.state as Parameters<typeof runTravelManager>[0]["state"],
    });

    return apiSuccess(result);
  } catch (err) {
    console.error("Travel manager error:", err);
    return apiError("Failed to process travel manager request", 500);
  }
}
