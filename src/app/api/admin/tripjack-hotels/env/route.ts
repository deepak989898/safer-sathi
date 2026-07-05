import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  getTripJackHotelEnvironmentSummary,
  isTripJackHotelLiveBookingAllowed,
} from "@/lib/tripjack-hotels/config";
import { getTripJackHotelOpsMeta, updateTripJackHotelOpsMeta } from "@/lib/tripjack-hotels/ops-firestore";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;
    const ops = await getTripJackHotelOpsMeta();
    return apiSuccess({
      environment: getTripJackHotelEnvironmentSummary(ops.liveBookingEnabled),
      ops,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load environment";
    return apiError(message, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;
    const { data, error } = await parseJsonBody(request);
    if (error) return error;

    const body = (data ?? {}) as { liveBookingEnabled?: boolean };
    if (typeof body.liveBookingEnabled === "boolean") {
      if (body.liveBookingEnabled && !isTripJackHotelLiveBookingAllowed(true)) {
        return apiError(
          "Cannot enable live booking: set TRIPJACK_HOTEL_ENV=production, Razorpay live keys, and TRIPJACK_HOTEL_LIVE_BOOKING=true",
          400
        );
      }
      await updateTripJackHotelOpsMeta({ liveBookingEnabled: body.liveBookingEnabled });
    }

    const ops = await getTripJackHotelOpsMeta();
    return apiSuccess({
      environment: getTripJackHotelEnvironmentSummary(ops.liveBookingEnabled),
      ops,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update environment";
    return apiError(message, 500);
  }
}
