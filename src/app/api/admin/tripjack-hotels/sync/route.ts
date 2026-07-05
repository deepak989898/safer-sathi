import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { syncRecentHotelBookingStatuses } from "@/lib/tripjack-hotels/booking-status-sync";
import { syncTripJackHotelCatalog } from "@/lib/tripjack-hotels/catalog-sync";
import type { TripJackHotelSyncMode } from "@/lib/tripjack-hotels/catalog-types";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { syncTripJackHotelNationalities } from "@/lib/tripjack-hotels/nationalities-sync";
import { listTripJackHotelSyncLogs } from "@/lib/tripjack-hotels/ops-firestore";
import { TripJackHotelStaticApiError } from "@/lib/tripjack-hotels/static-client";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const mode = (url.searchParams.get("mode") ?? "full") as TripJackHotelSyncMode;
    const maxPages = Number(url.searchParams.get("maxPages") ?? "50");
    const syncNext = url.searchParams.get("syncNext");

    if (mode === "nationalities") {
      const result = await syncTripJackHotelNationalities({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    if (mode === "booking_status") {
      const result = await syncRecentHotelBookingStatuses({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        limit: Number(url.searchParams.get("limit") ?? "50"),
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    const result = await syncTripJackHotelCatalog({
      mode,
      maxPages: Number.isFinite(maxPages) ? maxPages : 50,
      startSyncNext: syncNext || null,
      rebuildDestinations: mode !== "deleted_only",
      actorId: auth.user.id,
      actorEmail: auth.user.email,
    });

    const meta = await getTripJackHotelCatalogMeta();
    const recentLogs = await listTripJackHotelSyncLogs(5);

    return apiSuccess({ ...result, meta, recentLogs, mode, actor: auth.user.id });
  } catch (error) {
    if (error instanceof TripJackHotelStaticApiError) {
      return apiError(error.message, error.statusCode ?? 502, {
        upstreamUrl: error.upstreamUrl,
      });
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError(message, 500);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;
    const meta = await getTripJackHotelCatalogMeta();
    const logs = await listTripJackHotelSyncLogs(20);
    return apiSuccess({ meta, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sync status";
    return apiError(message, 500);
  }
}
