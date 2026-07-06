import type { NormalizedFlightBookingDetails } from "@/lib/tripjack/types";

export const CONFIRMED_ORDER_STATUSES = new Set([
  "SUCCESS",
  "COMPLETED",
  "CONFIRMED",
  "TICKETED",
  "BOOKED",
  "ISSUED",
  "ACTIVE",
]);

const FAILED_ORDER_STATUSES = new Set(["FAILED", "ABORTED", "CANCELLED", "REJECTED"]);

export function normalizeOrderStatus(status: string | undefined | null): string {
  return (status ?? "").trim().toUpperCase() || "UNKNOWN";
}

export function isBookingDetailsSuccess(orderStatus: string): boolean {
  const s = normalizeOrderStatus(orderStatus);
  return s === "SUCCESS" || s === "COMPLETED" || CONFIRMED_ORDER_STATUSES.has(s);
}

export function isBookingDetailsPending(orderStatus: string): boolean {
  const s = normalizeOrderStatus(orderStatus);
  return s === "PENDING" || s === "IN_PROGRESS" || s === "PROCESSING" || s === "ON_HOLD" || s === "HOLD";
}

export function isFailedOrderStatus(status: string): boolean {
  return FAILED_ORDER_STATUSES.has(normalizeOrderStatus(status));
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
