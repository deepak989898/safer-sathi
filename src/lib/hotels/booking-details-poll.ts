import "server-only";

import { handleHotelBookingPollOutcome } from "@/lib/hotels/booking-poll-outcome";
import { refreshHotelBookingDetails } from "@/lib/hotels/post-booking-service";
import {
  hasHotelVoucherMetadata,
  isHotelBookingConfirmedStatus,
  isHotelBookingFailedStatus,
  isHotelBookingPendingStatus,
  isHotelBookingTerminalFailure,
} from "@/lib/hotels/booking-status-helpers";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import type { HotelBookingRecord } from "@/lib/hotels/types";

import { HOTEL_BOOKING_POLL_DELAYS_MS } from "@/lib/hotels/booking-poll-schedule";

export { HOTEL_BOOKING_POLL_DELAYS_MS };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPollComplete(booking: HotelBookingRecord): boolean {
  if (isHotelBookingFailedStatus(booking) || isHotelBookingTerminalFailure(booking)) {
    return true;
  }
  if (isHotelBookingConfirmedStatus(booking) && hasHotelVoucherMetadata(booking)) {
    return true;
  }
  if (isHotelBookingConfirmedStatus(booking) && !isHotelBookingPendingStatus(booking)) {
    return true;
  }
  return false;
}

/** Poll TripJack booking-details with escalating intervals until confirmed, failed, or exhausted. */
export async function pollHotelBookingDetailsAfterBook(
  bookingId: string
): Promise<HotelBookingRecord | null> {
  let latest: HotelBookingRecord | null = await getHotelBookingById(bookingId);
  if (!latest) return null;

  const attempts = HOTEL_BOOKING_POLL_DELAYS_MS.length + 1;

  for (let i = 0; i < attempts; i += 1) {
    try {
      latest = await refreshHotelBookingDetails(bookingId, "poll");
    } catch {
      /* keep polling */
    }

    await updateHotelBooking(bookingId, {
      bookingDetailsPollAttempts: i + 1,
      lastStatusCheckedAt: new Date().toISOString(),
    });

    if (!latest) break;
    if (isPollComplete(latest)) {
      await handleHotelBookingPollOutcome(latest);
      return (await getHotelBookingById(bookingId)) ?? latest;
    }

    if (i < HOTEL_BOOKING_POLL_DELAYS_MS.length) {
      await sleep(HOTEL_BOOKING_POLL_DELAYS_MS[i]);
    }
  }

  if (latest) {
    await handleHotelBookingPollOutcome(latest);
  }
  return (await getHotelBookingById(bookingId)) ?? latest;
}
