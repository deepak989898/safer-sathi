import { apiError, apiSuccess } from "@/lib/api-response";
import { syncRecentHotelBookingStatuses } from "@/lib/tripjack-hotels/booking-status-sync";
import { syncTripJackHotelCatalog } from "@/lib/tripjack-hotels/catalog-sync";

export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.TRIPJACK_HOTEL_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/** Scheduled sync for TripJack Hotels — catalog incremental + booking status. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const url = new URL(request.url);
    const task = url.searchParams.get("task") ?? "booking_status";

    if (task === "catalog_incremental") {
      const result = await syncTripJackHotelCatalog({
        mode: "incremental",
        maxMappingPages: Number(url.searchParams.get("maxMappingPages") ?? "5"),
        maxContentBatches: Number(url.searchParams.get("maxContentBatches") ?? "20"),
        // Destination rebuilding scans the complete 100k+ hotel catalog.
        // Run that explicitly from admin after a full sync, not in the daily cron.
        rebuildDestinations: false,
        actorId: "cron",
        actorEmail: "cron@system",
      });
      return apiSuccess({ task, ...result });
    }

    if (task === "catalog_content") {
      const result = await syncTripJackHotelCatalog({
        mode: "content_only",
        maxContentBatches: Number(url.searchParams.get("maxContentBatches") ?? "50"),
        actorId: "cron",
        actorEmail: "cron@system",
      });
      return apiSuccess({ task, ...result });
    }

    if (task === "booking_status") {
      const result = await syncRecentHotelBookingStatuses({
        actorId: "cron",
        actorEmail: "cron@system",
        limit: Number(url.searchParams.get("limit") ?? "100"),
      });
      return apiSuccess({ task, ...result });
    }

    return apiError(
      "Unknown task. Use booking_status, catalog_incremental, or catalog_content.",
      400
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron sync failed";
    return apiError(message, 500);
  }
}
