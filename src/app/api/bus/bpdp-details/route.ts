import { z } from "zod";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchBpDpDetails } from "@/lib/seatseller/client";
import { parseSeatSellerBpDp } from "@/lib/seatseller/parse-trip-details";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  tripId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const raw = await fetchBpDpDetails(parsed.data.tripId);
    const bpdp = parseSeatSellerBpDp(raw);
    return apiSuccess(bpdp);
  } catch (error) {
    return busApiError(error, "Failed to load boarding/dropping points");
  }
}
