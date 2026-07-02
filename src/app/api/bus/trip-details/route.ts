import { z } from "zod";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchTripDetails } from "@/lib/seatseller/client";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  tripId: z.string().min(1),
});

/** Always live — never cache seat layout. */
export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const details = await fetchTripDetails(parsed.data.tripId);
    return apiSuccess({ details, live: true });
  } catch (error) {
    return busApiError(error, "Failed to load seat layout");
  }
}
