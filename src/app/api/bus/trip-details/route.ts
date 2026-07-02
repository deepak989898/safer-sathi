import { z } from "zod";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchTripDetails, fetchTripDetailsV2 } from "@/lib/seatseller/client";
import { parseSeatSellerTripDetails } from "@/lib/seatseller/parse-trip-details";
import { describeSeatSellerPayload } from "@/lib/seatseller/normalize";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";

const schema = z.object({
  tripId: z.string().min(1),
  bpId: z.string().optional(),
  dpId: z.string().optional(),
  bpDpSeatLayout: z.boolean().optional(),
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

    const raw =
      parsed.data.bpDpSeatLayout && parsed.data.bpId && parsed.data.dpId
        ? await fetchTripDetailsV2({
            inventoryId: parsed.data.tripId,
            bpId: parsed.data.bpId,
            dpId: parsed.data.dpId,
          })
        : await fetchTripDetails(parsed.data.tripId);

    const details = parseSeatSellerTripDetails(raw);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      details,
      live: true,
      ...(includeDebug
        ? { debug: { payloadShape: describeSeatSellerPayload(raw), seatCount: details.seats.length } }
        : {}),
    });
  } catch (error) {
    return busApiError(error, "Failed to load seat layout");
  }
}
