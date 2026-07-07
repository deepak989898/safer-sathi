import type { FlightBookingRecord } from "@/lib/flights/types";
import { hasFlightTicketMetadata } from "@/lib/flights/booking-status-helpers";

export type CustomerTicketDisplayStatus =
  | "confirmed"
  | "processing"
  | "failed"
  | "cancellation_requested"
  | "cancelled"
  | "other";

export function isTicketPageProcessingStatus(booking: FlightBookingRecord): boolean {
  if (booking.status === "confirmed" || booking.passengerTicketStatus === "CONFIRMED") {
    return false;
  }
  if (hasFlightTicketMetadata(booking.bookingDetailNormalized ?? booking.normalizedBookingDetails ?? null)) {
    if (booking.status !== "payment_received_booking_failed" && booking.status !== "booking_failed") {
      return false;
    }
  }
  return (
    booking.status === "booking_pending" ||
    booking.status === "payment_success" ||
    booking.status === "manual_review_required" ||
    booking.pipelineStatus === "BOOKING_DETAILS_POLLING" ||
    booking.passengerTicketStatus === "PENDING"
  );
}

export function getCustomerTicketDisplayStatus(
  booking: FlightBookingRecord
): CustomerTicketDisplayStatus {
  const details = booking.bookingDetailNormalized ?? booking.normalizedBookingDetails;
  const hasTicket = hasFlightTicketMetadata(details ?? null);

  if (
    booking.status === "confirmed" ||
    booking.passengerTicketStatus === "CONFIRMED" ||
    (hasTicket && booking.paymentStatus === "paid")
  ) {
    return "confirmed";
  }
  if (
    booking.status === "payment_received_booking_failed" ||
    booking.status === "booking_failed" ||
    booking.status === "failed_cancellation"
  ) {
    return "failed";
  }
  if (booking.status === "cancellation_requested" || booking.status === "refund_processing") {
    return "cancellation_requested";
  }
  if (
    booking.status === "cancelled" ||
    booking.status === "refund_completed"
  ) {
    return "cancelled";
  }
  if (isTicketPageProcessingStatus(booking)) return "processing";
  return "other";
}

export const TICKET_STATUS_BANNER: Record<
  CustomerTicketDisplayStatus,
  { title: string; description: string; className: string }
> = {
  confirmed: {
    title: "Booking Confirmed",
    description: "Your e-ticket is ready. PNR and ticket details are shown below.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  processing: {
    title: "Booking Processing",
    description:
      "Payment received. We are confirming your ticket with the airline — this page will update automatically.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  failed: {
    title: "Payment received — booking failed",
    description: "Your payment was successful but ticket issuance failed. Our support team will contact you shortly.",
    className: "border-red-200 bg-red-50 text-red-900",
  },
  cancelled: {
    title: "Booking cancelled",
    description: "This booking has been cancelled. Refund details are shown below if applicable.",
    className: "border-slate-200 bg-slate-50 text-slate-800",
  },
  cancellation_requested: {
    title: "Cancellation Requested",
    description: "Your cancellation is under review by airline/supplier. Use refresh to get latest status.",
    className: "border-orange-200 bg-orange-50 text-orange-900",
  },
  other: {
    title: "Booking status",
    description: "See details below for your current booking status.",
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
};

export const TICKET_PAGE_POLL_INTERVAL_MS = 8000;
export const TICKET_PAGE_POLL_MAX_MS = 180_000;
