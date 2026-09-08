import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { syncGoaHotelsForBookscubagoa } from "@/lib/tripjack-hotels/goa-export";

export const maxDuration = 300;

/** Super-admin: export Goa TripJack hotels → public `goaHotels` for Bookscubagoa. */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const result = await syncGoaHotelsForBookscubagoa();
    return apiSuccess({
      ...result,
      collection: "goaHotels",
      message: `Exported ${result.exported} Goa hotels (${result.withRooms} with room/price snapshots).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Goa hotel export failed";
    console.error("[admin/tripjack-hotels/export-goa]", message);
    return apiError(message, 500);
  }
}
