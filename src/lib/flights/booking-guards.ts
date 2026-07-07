import type { FlightBookingRecord } from "@/lib/flights/types";

export function canReleasePnr(booking: FlightBookingRecord): boolean {
  const isHold =
    booking.isHoldBooking ||
    booking.orderStatus === "ON_HOLD" ||
    booking.status === "hold";
  return Boolean(isHold && booking.paymentStatus !== "paid");
}

export function canCancelBooking(booking: FlightBookingRecord): boolean {
  if (booking.paymentStatus !== "paid") return false;
  const blocked = new Set([
    "cancellation_requested",
    "cancelled",
    "failed_cancellation",
    "refund_processing",
    "refund_pending",
    "refund_completed",
    "released",
    "payment_failed",
    "booking_failed",
  ]);
  return !blocked.has(booking.status);
}
