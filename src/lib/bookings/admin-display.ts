import type { Booking } from "@/types";

export type BookingAdminFilter =
  | "all"
  | "payment_failed"
  | "pending"
  | "confirmed"
  | "cancelled";

export function formatBookingDateTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function bookingSourceLabel(booking: Booking): string {
  return booking.aiProcessed ? "AI Assistant" : "Website";
}

export function bookingSourceDetail(booking: Booking): string {
  if (booking.aiProcessed) {
    if (booking.serviceType === "holiday") return "AI · Custom package";
    if (booking.serviceType === "vehicle") return "AI · Vehicle";
    if (booking.serviceType === "hotel") return "AI · Hotel";
    return "AI · Travel booking";
  }
  if (booking.serviceType === "package" || booking.serviceType === "holiday") {
    return "Website · Package";
  }
  if (booking.serviceType === "vehicle") return "Website · Vehicle";
  if (booking.serviceType === "hotel") return "Website · Hotel";
  return `Website · ${booking.serviceType.replace(/_/g, " ")}`;
}

export function matchesBookingAdminFilter(
  booking: Booking,
  filter: BookingAdminFilter
): boolean {
  switch (filter) {
    case "payment_failed":
      return booking.paymentStatus === "failed";
    case "pending":
      return booking.status === "pending";
    case "confirmed":
      return booking.status === "confirmed" || booking.status === "upcoming";
    case "cancelled":
      return booking.status === "cancelled" || booking.status === "refunded";
    default:
      return true;
  }
}

export function countBookingsByFilter(
  bookings: Booking[],
  filter: BookingAdminFilter
): number {
  return bookings.filter((b) => matchesBookingAdminFilter(b, filter)).length;
}

export function searchBookings(bookings: Booking[], query: string): Booking[] {
  const q = query.trim().toLowerCase();
  if (!q) return bookings;
  return bookings.filter((b) => {
    const haystack = [
      b.bookingNumber,
      b.customerName,
      b.customerEmail,
      b.customerPhone,
      b.serviceName.en,
      b.serviceName.hi,
      b.serviceType,
      bookingSourceLabel(b),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortBookingsNewestFirst(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
