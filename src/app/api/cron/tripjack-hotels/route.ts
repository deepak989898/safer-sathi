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
        maxPages: Number(url.searchParams.get("maxPages") ?? "20"),
        actorId: "cron",
        actorEmail: "cron@system",
      });
      return apiSuccess({ task, ...result });
    }

    if (task === "catalog_deleted") {
      const result = await syncTripJackHotelCatalog({
        mode: "deleted_only",
        maxPages: Number(url.searchParams.get("maxPages") ?? "20"),
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

    return apiError("Unknown task. Use booking_status, catalog_incremental, or catalog_deleted.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron sync failed";
    return apiError(message, 500);
  }
}
