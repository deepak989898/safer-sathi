/** Shared default check-in / check-out for featured & direct hotel links. */
export function getDefaultHotelSearchDates(): { checkIn: string; checkOut: string } {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

export const DEFAULT_FEATURED_HOTEL_ROOMS = [{ adults: 2 }] as const;
