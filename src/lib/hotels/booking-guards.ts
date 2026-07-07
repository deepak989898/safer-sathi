import type { HotelBookingRecord } from "@/lib/hotels/types";

const BLOCKED_CANCEL_STATUSES = new Set([
  "cancelled",
  "refund_pending",
  "refunded",
  "payment_failed",
  "booking_failed",
  "review_confirmed",
  "payment_pending",
]);

const BLOCKED_CANCELLATION_STATUS = new Set(["REQUESTED", "CANCELLED", "SUCCESS"]);

export function canCancelHotelBooking(booking: HotelBookingRecord): boolean {
  if (booking.paymentStatus !== "paid") return false;
  if (BLOCKED_CANCEL_STATUSES.has(booking.status)) return false;
  if (
    booking.cancellationStatus &&
    BLOCKED_CANCELLATION_STATUS.has(booking.cancellationStatus.toUpperCase())
  ) {
    return false;
  }
  const localPolicyAvailable =
    Boolean(booking.reviewNormalized?.option.penalties?.length) ||
    booking.reviewNormalized?.option.isRefundable === true;
  if (booking.cancellationAllowed === false && !localPolicyAvailable) return false;

  const checkIn = booking.checkIn ? new Date(`${booking.checkIn}T14:00:00`) : null;
  if (checkIn && checkIn.getTime() < Date.now()) return false;

  return booking.status === "confirmed" || booking.status === "booking_pending";
}

export function isHotelVoucherReady(booking: HotelBookingRecord): boolean {
  return Boolean(booking.voucherUrl || booking.voucherNumber || booking.confirmationNumber);
}
