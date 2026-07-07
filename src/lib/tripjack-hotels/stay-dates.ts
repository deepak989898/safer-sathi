function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Default stay: tonight → tomorrow (1 night). */
export function getDefaultHotelStayDates(): { checkIn: string; checkOut: string } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    checkIn: formatIsoDate(today),
    checkOut: formatIsoDate(addDays(today, 1)),
  };
}
