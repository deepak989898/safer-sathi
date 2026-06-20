import { trackLeadEvent } from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  sessionId: z.string().min(8),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  type: z.enum([
    "destination_search",
    "hotel_view",
    "vehicle_view",
    "page_visit",
    "booking_attempt",
    "time_on_site",
  ]),
  destination: z.string().optional(),
  minutes: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const lead = await trackLeadEvent(parsed.data);
    return apiSuccess({ lead, tracked: !!lead });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Track failed", 500);
  }
}
