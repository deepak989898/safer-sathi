import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { listTripJackHotelApiLogs } from "@/lib/tripjack-hotels/ops-firestore";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const logs = await listTripJackHotelApiLogs({
      limit: Number(url.searchParams.get("limit") ?? "50"),
      endpoint: url.searchParams.get("endpoint") ?? undefined,
      bookingId: url.searchParams.get("bookingId") ?? undefined,
    });

    return apiSuccess({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load API logs";
    return apiError(message, 500);
  }
}
