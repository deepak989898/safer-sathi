import type { FlightBookingRecord, FlightPipelineStatus } from "@/lib/flights/types";

export type { FlightPipelineStatus } from "@/lib/flights/types";

export function pipelineStatusLabel(status: FlightPipelineStatus): string {
  switch (status) {
    case "PAYMENT_SUCCESS":
      return "Payment success";
    case "TRIPJACK_BOOKING_STARTED":
      return "TripJack book started";
    case "TRIPJACK_BOOKING_FAILED":
      return "TripJack book failed";
    case "BOOKING_DETAILS_POLLING":
      return "Polling booking details";
    case "CONFIRMED":
      return "Confirmed";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function pipelineStatusBadgeClass(status: FlightPipelineStatus): string {
  if (status === "CONFIRMED") return "bg-emerald-100 text-emerald-800";
  if (status === "FAILED" || status === "TRIPJACK_BOOKING_FAILED") {
    return "bg-red-100 text-red-800";
  }
  if (
    status === "PAYMENT_SUCCESS" ||
    status === "TRIPJACK_BOOKING_STARTED" ||
    status === "BOOKING_DETAILS_POLLING"
  ) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export function derivePipelineStatus(booking: FlightBookingRecord): FlightPipelineStatus | null {
  if (booking.pipelineStatus) return booking.pipelineStatus;
  if (booking.status === "confirmed") return "CONFIRMED";
  if (booking.status === "payment_received_booking_failed") return "FAILED";
  if (booking.bookingDetailsPollStatus && booking.status === "booking_pending") {
    return "BOOKING_DETAILS_POLLING";
  }
  if (booking.tripjackBookAttempted && booking.tripjackBookingStatus === "FAILED") {
    return "TRIPJACK_BOOKING_FAILED";
  }
  if (booking.tripjackBookAttempted) return "TRIPJACK_BOOKING_STARTED";
  if (booking.paymentStatus === "paid" && booking.status === "payment_success") {
    return "PAYMENT_SUCCESS";
  }
  return null;
}
