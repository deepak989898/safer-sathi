import type { HotelBookingRecord } from "@/lib/hotels/types";

const PENDING_STATUSES = new Set([
  "booking_pending",
  "payment_success",
  "manual_review_required",
  "review_confirmed",
  "payment_pending",
]);

const CONFIRMED_STATUSES = new Set(["confirmed"]);

const FAILED_STATUSES = new Set([
  "booking_failed",
  "payment_failed",
  "payment_received_booking_failed",
]);

/** Supplier statuses that mean booking was rejected — not user cancellation. */
const SUPPLIER_HARD_FAILURES = new Set([
  "FAILED",
  "REJECTED",
  "BOOKING_FAILED",
  "BOOK_FAILED",
  "DECLINED",
]);

const SUPPLIER_SUCCESS_MARKERS = new Set([
  "SUCCESS",
  "COMPLETED",
  "CONFIRMED",
  "BOOKED",
  "ACTIVE",
]);

export type HotelBookingUiStatus = "confirmed" | "pending" | "failed";

function normalizeTripJackStatus(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function isSupplierBookingSuccessStatus(value: string | undefined): boolean {
  const normalized = normalizeTripJackStatus(value);
  if (!normalized) return false;
  return SUPPLIER_SUCCESS_MARKERS.has(normalized);
}

export function isSupplierBookingHardFailure(value: string | undefined): boolean {
  const normalized = normalizeTripJackStatus(value);
  if (!normalized) return false;
  return SUPPLIER_HARD_FAILURES.has(normalized);
}

export function isHotelBookingPendingStatus(booking: HotelBookingRecord): boolean {
  return PENDING_STATUSES.has(booking.status) && booking.paymentStatus === "paid";
}

export function isHotelBookingConfirmedStatus(booking: HotelBookingRecord): boolean {
  return CONFIRMED_STATUSES.has(booking.status);
}

export function isHotelBookingFailedStatus(booking: HotelBookingRecord): boolean {
  if (FAILED_STATUSES.has(booking.status)) return true;
  if (booking.status === "cancelled" && booking.cancellationStatus === "CANCELLED") {
    return true;
  }
  return false;
}

export function hasHotelVoucherMetadata(booking: HotelBookingRecord): boolean {
  return Boolean(
    booking.voucherUrl ||
      booking.confirmationNumber ||
      booking.voucherNumber ||
      booking.supplierReference ||
      booking.bookingDetailsNormalized?.voucherUrl ||
      booking.bookingDetailsNormalized?.confirmationNumber
  );
}

/**
 * True only when the supplier explicitly rejected the booking.
 * Never treats a confirmed Firestore record as failed because of ambiguous poll data.
 */
export function isHotelSupplierRejected(booking: HotelBookingRecord): boolean {
  if (booking.status === "confirmed") return false;

  if (isSupplierBookingHardFailure(booking.tripjackStatus)) return true;

  const details = booking.bookingDetailsNormalized;
  if (!details) return false;

  if (details.statusSuccess === false) {
    if (
      isSupplierBookingHardFailure(details.bookingStatus) ||
      isSupplierBookingHardFailure(details.orderStatus)
    ) {
      return true;
    }
  }

  return false;
}

export function isHotelBookingTerminalFailure(booking: HotelBookingRecord): boolean {
  if (booking.status === "confirmed") return false;
  if (isHotelBookingFailedStatus(booking)) return true;
  return isHotelSupplierRejected(booking);
}

export function resolveHotelBookingUiStatus(booking: HotelBookingRecord): HotelBookingUiStatus {
  if (isHotelBookingFailedStatus(booking) || isHotelSupplierRejected(booking)) {
    return "failed";
  }

  if (isHotelBookingConfirmedStatus(booking)) {
    return "confirmed";
  }

  if (
    booking.paymentStatus === "paid" &&
    (isHotelBookingPendingStatus(booking) ||
      booking.status === "booking_pending" ||
      booking.status === "manual_review_required" ||
      booking.status === "payment_success")
  ) {
    return "pending";
  }

  if (booking.paymentStatus === "paid" && hasHotelVoucherMetadata(booking)) {
    return "confirmed";
  }

  return "pending";
}

export function getHotelReferenceLabel(booking: HotelBookingRecord): string {
  return (
    booking.supplierReference ||
    booking.confirmationNumber ||
    booking.tripjackBookingId ||
    "—"
  );
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
