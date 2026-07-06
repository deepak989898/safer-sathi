import "server-only";

import {
  hasFlightTicketMetadata,
  isBookingDetailsPending,
  isBookingDetailsSuccess,
  isFailedOrderStatus,
  normalizeOrderStatus,
} from "@/lib/flights/booking-status-helpers";
import type { FlightBookingRecord, FlightBookingStatus } from "@/lib/flights/types";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import type { NormalizedFlightBookingDetails } from "@/lib/tripjack/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function isConfirmedOrderStatus(status: string): boolean {
  return isBookingDetailsSuccess(status);
}

export function isPendingOrderStatus(status: string): boolean {
  const s = normalizeOrderStatus(status);
  return isBookingDetailsPending(s) || s === "UNKNOWN";
}

/** TripJack book response indicates successful book call. */
export function isTripJackBookResponseSuccess(bookResponse: unknown): boolean {
  const record = asRecord(bookResponse);
  if (!record) return false;
  const data = asRecord(record.data) ?? record;
  const status = asRecord(data.status) ?? asRecord(record.status);
  if (status?.success === true) return true;
  if (record.success === true && extractTripJackBookingId(bookResponse)) return true;
  const httpStatus = Number(status?.httpStatus ?? record.status);
  if (httpStatus >= 200 && httpStatus < 300 && extractTripJackBookingId(bookResponse)) return true;
  return false;
}

/** Booking is confirmed when TripJack order/ticket data says so OR PNR/ticket exists. */
export function isTripJackBookingConfirmed(input: {
  normalized: NormalizedFlightBookingDetails | null;
  orderStatus?: string;
  bookResponse?: unknown;
}): boolean {
  const orderStatus = normalizeOrderStatus(
    input.orderStatus ?? input.normalized?.orderStatus ?? input.normalized?.tripStatus
  );

  if (isFailedOrderStatus(orderStatus)) return false;

  if (isBookingDetailsSuccess(orderStatus)) return true;

  if (hasFlightTicketMetadata(input.normalized)) {
    return true;
  }

  if (input.normalized?.passengers?.some((p) => p.status?.toUpperCase() === "CONFIRMED")) {
    return true;
  }

  return false;
}

export function derivePassengerTicketStatus(
  normalized: NormalizedFlightBookingDetails | null,
  bookingStatus: FlightBookingStatus
): "CONFIRMED" | "PENDING" | "FAILED" {
  if (bookingStatus === "payment_received_booking_failed" || bookingStatus === "booking_failed") {
    return "FAILED";
  }
  if (bookingStatus === "confirmed") return "CONFIRMED";

  const passengers = normalized?.passengers ?? [];
  if (passengers.length > 0) {
    const allConfirmed = passengers.every(
      (p) =>
        p.pnr ||
        p.ticketNumber ||
        p.status?.toUpperCase() === "CONFIRMED" ||
        p.status?.toUpperCase() === "SUCCESS"
    );
    if (allConfirmed) return "CONFIRMED";
  }

  if (hasFlightTicketMetadata(normalized)) return "CONFIRMED";
  return "PENDING";
}

export function deriveFlightBookingStatus(
  booking: FlightBookingRecord,
  normalized: NormalizedFlightBookingDetails | null,
  orderStatus?: string
): FlightBookingStatus {
  const terminal = new Set<FlightBookingStatus>([
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refund_completed",
    "released",
  ]);
  if (terminal.has(booking.status)) return booking.status;

  if (booking.status === "payment_received_booking_failed") return booking.status;
  if (booking.paymentStatus !== "paid") return booking.status;

  const os = normalizeOrderStatus(orderStatus ?? normalized?.orderStatus);

  if (normalized?.isHoldBooking && booking.paymentStatus !== "paid") return "hold";

  if (isTripJackBookingConfirmed({ normalized, orderStatus: os, bookResponse: booking.bookResponse })) {
    return "confirmed";
  }

  if (isFailedOrderStatus(os) && booking.tripjackBookAttempted) {
    return "payment_received_booking_failed";
  }

  if (
    booking.paymentStatus === "paid" &&
    (isPendingOrderStatus(os) || booking.tripjackBookAttempted || booking.bookResponse)
  ) {
    return "booking_pending";
  }

  return booking.status;
}

export type BookingDetailSyncPatch = Partial<FlightBookingRecord> & {
  lastStatusSyncedAt: string;
};

export function buildBookingDetailSyncPatch(
  booking: FlightBookingRecord,
  normalized: NormalizedFlightBookingDetails,
  detailsResponse: unknown
): BookingDetailSyncPatch {
  const now = new Date().toISOString();
  const status = deriveFlightBookingStatus(booking, normalized, normalized.orderStatus);
  const passengerTicketStatus = derivePassengerTicketStatus(normalized, status);
  const ticketNo =
    normalized.ticketNumber ||
    normalized.passengers.find((p) => p.ticketNumber)?.ticketNumber ||
    booking.ticketNumber;

  return {
    bookingDetailResponse: detailsResponse,
    bookingDetailsResponse: detailsResponse,
    bookingDetailNormalized: normalized,
    normalizedBookingDetails: normalized,
    tripjackBookingId: normalized.bookingId || booking.tripjackBookingId,
    pnr: normalized.pnr || booking.pnr,
    airlinePnr: normalized.airlinePnr || booking.airlinePnr,
    ticketNumber: ticketNo,
    ticketNo,
    ticketStatus: normalized.ticketStatus || normalized.orderStatus,
    orderStatus: normalized.orderStatus,
    tripjackStatus: normalized.tripStatus || normalized.orderStatus,
    bookingStatus: status,
    passengerTicketStatus,
    isHoldBooking: normalized.isHoldBooking,
    totalFare: normalized.fareDetails.totalFare || booking.totalFare,
    baseFare: normalized.fareDetails.baseFare || booking.baseFare,
    taxesAndFees: normalized.fareDetails.taxesAndFees || booking.taxesAndFees,
    status,
    pipelineStatus:
      status === "confirmed"
        ? "CONFIRMED"
        : status === "payment_received_booking_failed"
          ? "FAILED"
          : "BOOKING_DETAILS_POLLING",
    tripjackBookingStatus:
      status === "confirmed" ? "SUCCESS" : status === "payment_received_booking_failed" ? "FAILED" : "PENDING",
    lastStatusSyncedAt: now,
  };
}

export function isTicketPageProcessingStatus(booking: FlightBookingRecord): boolean {
  if (booking.status === "confirmed" || booking.passengerTicketStatus === "CONFIRMED") {
    return false;
  }
  return (
    booking.status === "booking_pending" ||
    booking.status === "payment_success" ||
    booking.status === "manual_review_required" ||
    booking.pipelineStatus === "BOOKING_DETAILS_POLLING" ||
    booking.passengerTicketStatus === "PENDING"
  );
}

export type CustomerTicketDisplayStatus =
  | "confirmed"
  | "processing"
  | "failed"
  | "cancelled"
  | "other";

export function getCustomerTicketDisplayStatus(
  booking: FlightBookingRecord
): CustomerTicketDisplayStatus {
  if (booking.status === "confirmed" || booking.passengerTicketStatus === "CONFIRMED") {
    return "confirmed";
  }
  if (
    booking.status === "payment_received_booking_failed" ||
    booking.status === "booking_failed"
  ) {
    return "failed";
  }
  if (
    booking.status === "cancelled" ||
    booking.status === "cancellation_requested" ||
    booking.status === "refund_completed"
  ) {
    return "cancelled";
  }
  if (isTicketPageProcessingStatus(booking)) return "processing";
  return "other";
}

/** After payment, keep polling booking-details for up to ~3 minutes. */
export const TICKET_PAGE_POLL_INTERVAL_MS = 8000;
export const TICKET_PAGE_POLL_MAX_MS = 180_000;
