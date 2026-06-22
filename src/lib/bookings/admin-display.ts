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

  const tokens = q.split(/\s+/).filter(Boolean);
  const qDigits = q.replace(/\D/g, "");

  return bookings.filter((b) => {
    const haystack = bookingSearchHaystack(b);

    const tokensMatch = tokens.every((token) => {
      if (haystack.includes(token)) return true;
      const tokenDigits = token.replace(/\D/g, "");
      if (
        tokenDigits.length >= 3 &&
        bookingPhoneDigits(b).includes(tokenDigits)
      ) {
        return true;
      }
      return false;
    });
    if (tokensMatch) return true;

    if (qDigits.length >= 3 && bookingPhoneDigits(b).includes(qDigits)) {
      return true;
    }

    return haystack.includes(q);
  });
}

function bookingPhoneDigits(booking: Booking): string {
  return (booking.customerPhone ?? "").replace(/\D/g, "");
}

function bookingSearchHaystack(booking: Booking): string {
  return [
    booking.bookingNumber,
    booking.id,
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
    bookingPhoneDigits(booking),
    booking.serviceName?.en,
    booking.serviceName?.hi,
    booking.serviceType,
    bookingSourceLabel(booking),
    booking.notes,
    booking.status,
    booking.paymentStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getBookedDateKey(iso?: string): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBookedDateGroupLabel(dateKey: string): string {
  if (dateKey === "unknown") return "Unknown date";

  const [year, month, day] = dateKey.split("-").map(Number);
  const groupDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = new Date(groupDate);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "Today";
  if (compareDate.getTime() === yesterday.getTime()) return "Yesterday";

  return groupDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function groupBookingsByBookedDate(
  bookings: Booking[]
): { dateKey: string; label: string; bookings: Booking[] }[] {
  const map = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const key = getBookedDateKey(booking.createdAt);
    const list = map.get(key) ?? [];
    list.push(booking);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({
      dateKey,
      label: formatBookedDateGroupLabel(dateKey),
      bookings: sortBookingsNewestFirst(items),
    }));
}

export function sortBookingsNewestFirst(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });
}
