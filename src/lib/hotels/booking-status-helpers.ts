import type { HotelBookingRecord } from "@/lib/hotels/types";

const PENDING_STATUSES = new Set([
  "booking_pending",
  "payment_success",
  "manual_review_required",
]);

const CONFIRMED_STATUSES = new Set(["confirmed"]);

const FAILED_STATUSES = new Set(["booking_failed", "payment_failed", "cancelled"]);

const TERMINAL_TRIPJACK_STATUSES = new Set([
  "FAILED",
  "REJECTED",
  "BOOKING_FAILED",
  "BOOK_FAILED",
  "CANCELLED",
  "DECLINED",
]);

export function isHotelBookingPendingStatus(booking: HotelBookingRecord): boolean {
  return PENDING_STATUSES.has(booking.status) && booking.paymentStatus === "paid";
}

export function isHotelBookingConfirmedStatus(booking: HotelBookingRecord): boolean {
  return CONFIRMED_STATUSES.has(booking.status);
}

export function isHotelBookingFailedStatus(booking: HotelBookingRecord): boolean {
  return FAILED_STATUSES.has(booking.status);
}

export function hasHotelVoucherMetadata(booking: HotelBookingRecord): boolean {
  return Boolean(
    booking.voucherUrl ||
      booking.confirmationNumber ||
      booking.voucherNumber ||
      booking.bookingDetailsNormalized?.voucherUrl ||
      booking.bookingDetailsNormalized?.confirmationNumber
  );
}

function normalizeTripJackStatus(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function isHotelBookingTerminalFailure(booking: HotelBookingRecord): boolean {
  if (booking.status === "booking_failed") return true;

  const tripjackStatus = normalizeTripJackStatus(booking.tripjackStatus);
  if (TERMINAL_TRIPJACK_STATUSES.has(tripjackStatus)) return true;

  const details = booking.bookingDetailsNormalized;
  if (!details) return false;

  const bookingStatus = normalizeTripJackStatus(details.bookingStatus);
  const orderStatus = normalizeTripJackStatus(details.orderStatus);

  if (TERMINAL_TRIPJACK_STATUSES.has(bookingStatus) || TERMINAL_TRIPJACK_STATUSES.has(orderStatus)) {
    return true;
  }

  return details.statusSuccess === false && TERMINAL_TRIPJACK_STATUSES.has(bookingStatus);
}

export function isHotelBookingUpcoming(booking: HotelBookingRecord): boolean {
  const activeStatuses: HotelBookingRecord["status"][] = [
    "confirmed",
    "payment_success",
    "booking_pending",
    "review_confirmed",
    "payment_pending",
  ];
  if (!activeStatuses.includes(booking.status)) return false;
  if (booking.status === "cancelled" || booking.status === "booking_failed") return false;
  const checkOut = booking.checkOut?.slice(0, 10);
  if (!checkOut) return true;
  return checkOut >= new Date().toISOString().slice(0, 10);
}

export function isHotelBookingCompleted(booking: HotelBookingRecord): boolean {
  if (booking.status !== "confirmed") return false;
  const checkOut = booking.checkOut?.slice(0, 10);
  if (!checkOut) return false;
  return checkOut < new Date().toISOString().slice(0, 10);
}
