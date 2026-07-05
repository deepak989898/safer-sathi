import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { syncTripJackHotelCatalog } from "@/lib/tripjack-hotels/catalog-sync";
import { listTripJackHotelSyncLogs } from "@/lib/tripjack-hotels/ops-firestore";
import { TripJackHotelStaticApiError } from "@/lib/tripjack-hotels/static-client";

export const maxDuration = 300;

/** @deprecated Use POST /api/admin/tripjack-hotels/sync?mode=full */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const maxPages = Number(url.searchParams.get("maxPages") ?? "50");
    const startSyncNext = url.searchParams.get("syncNext");

    const result = await syncTripJackHotelCatalog({
      mode: "full",
      maxPages: Number.isFinite(maxPages) ? maxPages : 50,
      startSyncNext: startSyncNext || null,
      rebuildDestinations: true,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
    });

    const meta = await getTripJackHotelCatalogMeta();
    const recentLogs = await listTripJackHotelSyncLogs(5);

    return apiSuccess({
      ...result,
      meta,
      recentLogs,
      mode: "full",
      deprecated: true,
      useInstead: "/api/admin/tripjack-hotels/sync?mode=full",
      actor: auth.user.id,
    });
  } catch (error) {
    if (error instanceof TripJackHotelStaticApiError) {
      return apiError(error.message, error.statusCode ?? 502, {
        upstreamUrl: error.upstreamUrl,
      });
    }
    const message = error instanceof Error ? error.message : "Hotel catalog sync failed";
    return apiError(message, 500);
  }
}

/** @deprecated Use GET /api/admin/tripjack-hotels/sync */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const meta = await getTripJackHotelCatalogMeta();
    const logs = await listTripJackHotelSyncLogs(20);
    return apiSuccess({ meta, logs, deprecated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load catalog meta";
    return apiError(message, 500);
  }
}
