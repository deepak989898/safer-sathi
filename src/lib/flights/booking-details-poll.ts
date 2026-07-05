import "server-only";

import { fetchTripJackBookingDetails } from "@/lib/tripjack/client";
import { normalizeTripJackBookingDetails } from "@/lib/tripjack/parse-booking-details";
import type { NormalizedFlightBookingDetails } from "@/lib/tripjack/types";

export const BOOKING_DETAILS_INITIAL_DELAY_MS = 5000;
export const BOOKING_DETAILS_POLL_INTERVAL_MS = 5000;
export const BOOKING_DETAILS_MAX_RETRIES = 12;

const TERMINAL_FAILURE = new Set(["FAILED", "ABORTED", "CANCELLED"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isBookingDetailsSuccess(orderStatus: string): boolean {
  const s = orderStatus.toUpperCase();
  return s === "SUCCESS" || s === "COMPLETED";
}

export function isBookingDetailsPending(orderStatus: string): boolean {
  const s = orderStatus.toUpperCase();
  return s === "PENDING" || s === "IN_PROGRESS" || s === "PROCESSING";
}

export function hasFlightTicketMetadata(details: NormalizedFlightBookingDetails | null): boolean {
  if (!details) return false;
  return Boolean(
    details.pnr ||
      details.airlinePnr ||
      details.ticketNumber ||
      details.passengers.some((p) => p.pnr || p.ticketNumber)
  );
}

/** Poll TripJack OMS booking-details after book (5s initial delay, 5s interval, max 12 tries). */
export async function pollTripJackFlightBookingDetails(input: {
  tripjackBookingId: string;
  bookResponse: unknown;
  onAttempt?: (attempt: number, orderStatus: string) => void | Promise<void>;
}): Promise<{
  detailsResponse: unknown;
  normalized: NormalizedFlightBookingDetails | null;
  attempts: number;
  finalStatus: string;
}> {
  await sleep(BOOKING_DETAILS_INITIAL_DELAY_MS);

  let lastDetails: unknown = null;
  let normalized: NormalizedFlightBookingDetails | null = null;
  let orderStatus = "PENDING";

  for (let i = 0; i < BOOKING_DETAILS_MAX_RETRIES; i++) {
    const attempt = i + 1;
    lastDetails = await fetchTripJackBookingDetails(input.tripjackBookingId, {
      requirePaxPricing: true,
    });
    normalized = normalizeTripJackBookingDetails(input.bookResponse, lastDetails);
    orderStatus = normalized?.orderStatus ?? "UNKNOWN";
    await input.onAttempt?.(attempt, orderStatus);

    const terminalFailure = TERMINAL_FAILURE.has(orderStatus.toUpperCase());
    const success = isBookingDetailsSuccess(orderStatus);
    const hasTicket = hasFlightTicketMetadata(normalized);

    if (terminalFailure) {
      return { detailsResponse: lastDetails, normalized, attempts: attempt, finalStatus: orderStatus };
    }

    if (success && hasTicket) {
      return { detailsResponse: lastDetails, normalized, attempts: attempt, finalStatus: orderStatus };
    }

    if (!isBookingDetailsPending(orderStatus) && hasTicket) {
      return { detailsResponse: lastDetails, normalized, attempts: attempt, finalStatus: orderStatus };
    }

    if (i < BOOKING_DETAILS_MAX_RETRIES - 1) {
      await sleep(BOOKING_DETAILS_POLL_INTERVAL_MS);
    }
  }

  return {
    detailsResponse: lastDetails,
    normalized,
    attempts: BOOKING_DETAILS_MAX_RETRIES,
    finalStatus: orderStatus,
  };
}
