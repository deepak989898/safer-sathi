import type { Booking } from "@/types";

/** Build admin bookings URL that highlights a specific booking in search. */
export function adminBookingsHref(booking?: Pick<Booking, "id" | "bookingNumber">): string {
  if (!booking?.bookingNumber) return "/admin/bookings";
  const params = new URLSearchParams({ search: booking.bookingNumber });
  if (booking.id) params.set("bookingId", booking.id);
  return `/admin/bookings?${params.toString()}`;
}
