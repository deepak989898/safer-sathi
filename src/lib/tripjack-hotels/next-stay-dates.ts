import { addDays, formatIsoDate } from "@/lib/tripjack-hotels/stay-dates";

export interface StayDateOption {
  checkIn: string;
  checkOut: string;
  dayLabel: string;
  dateLabel: string;
}

function parseLocalNoon(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

export function formatStayDayLabel(checkIn: string): string {
  return parseLocalNoon(checkIn).toLocaleDateString("en-IN", { weekday: "short" });
}

export function formatStayDateLabel(checkIn: string): string {
  return parseLocalNoon(checkIn).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/** Next N nights starting today (check-out = check-in + 1 night). */
export function buildNextStayDates(count = 7): StayDateOption[] {
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const checkInDate = addDays(start, index);
    const checkOutDate = addDays(checkInDate, 1);
    const checkIn = formatIsoDate(checkInDate);
    return {
      checkIn,
      checkOut: formatIsoDate(checkOutDate),
      dayLabel: formatStayDayLabel(checkIn),
      dateLabel: formatStayDateLabel(checkIn),
    };
  });
}
