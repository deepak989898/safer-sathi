import { apiError, apiSuccess } from "@/lib/api-response";
import { listTripJackHotelNationalities } from "@/lib/tripjack-hotels/ops-firestore";

export async function GET() {
  try {
    const nationalities = await listTripJackHotelNationalities(500);
    return apiSuccess({ nationalities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load nationalities";
    return apiError(message, 500);
  }
}
