import { listAllHotelBookingsForAdmin } from "@/lib/hotels/firestore";
import { refreshHotelBookingDetails } from "@/lib/hotels/post-booking-service";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { updateTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import {
  createTripJackHotelSyncLog,
  updateTripJackHotelOpsMeta,
  updateTripJackHotelSyncLog,
} from "@/lib/tripjack-hotels/ops-firestore";

const SYNC_STATUSES = new Set<HotelBookingRecord["status"]>([
  "payment_success",
  "booking_pending",
  "confirmed",
  "manual_review_required",
  "cancellation_requested",
  "refund_pending",
]);

export async function syncRecentHotelBookingStatuses(input: {
  actorId: string;
  actorEmail?: string;
  limit?: number;
  maxAgeDays?: number;
}): Promise<{
  scanned: number;
  refreshed: number;
  failed: number;
  message: string;
}> {
  const started = Date.now();
  const logId = await createTripJackHotelSyncLog({
    mode: "booking_status",
    startedAt: new Date().toISOString(),
    success: false,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    pagesFetched: 0,
    hotelsUpserted: 0,
    deletedMarked: 0,
    destinationsIndexed: 0,
    nationalitiesSynced: 0,
    failedRecords: 0,
    lastSyncNext: null,
  });

  const maxAgeMs = (input.maxAgeDays ?? 30) * 86400000;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const all = await listAllHotelBookingsForAdmin(500);

  const candidates = all
    .filter(
      (b) =>
        b.paymentStatus === "paid" &&
        SYNC_STATUSES.has(b.status) &&
        b.tripjackBookingId &&
        b.createdAt >= cutoff
    )
    .slice(0, input.limit ?? 50);

  let refreshed = 0;
  let failed = 0;

  for (const booking of candidates) {
    try {
      await refreshHotelBookingDetails(booking.bookingId, input.actorEmail ?? "sync");
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  const completedAt = new Date().toISOString();
  await updateTripJackHotelCatalogMeta({ lastBookingStatusSyncAt: completedAt });
  await updateTripJackHotelOpsMeta({ lastBookingStatusSyncAt: completedAt });

  await updateTripJackHotelSyncLog(logId, {
    completedAt,
    success: failed === 0,
    failedRecords: failed,
    hotelsUpserted: refreshed,
    durationMs: Date.now() - started,
    errorMessage: failed > 0 ? `${failed} booking(s) failed to refresh` : undefined,
  });

  return {
    scanned: candidates.length,
    refreshed,
    failed,
    message: `Refreshed ${refreshed}/${candidates.length} booking(s)`,
  };
}
