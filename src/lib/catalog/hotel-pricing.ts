import type { Hotel, HotelRoom } from "@/types";

/** Lowest available nightly rate from room types, or hotel.priceFrom as fallback. */
export function getEffectiveHotelPriceFrom(hotel: Pick<Hotel, "priceFrom" | "rooms">): number {
  const roomPrices = (hotel.rooms ?? [])
    .filter((room) => room.available !== false && Number(room.pricePerNight) > 0)
    .map((room) => room.pricePerNight);

  if (roomPrices.length === 0) return hotel.priceFrom;
  return Math.min(...roomPrices);
}

export function getCheapestHotelRoom(hotel: Pick<Hotel, "rooms">): HotelRoom | null {
  const available = (hotel.rooms ?? []).filter(
    (room) => room.available !== false && Number(room.pricePerNight) > 0
  );
  if (available.length === 0) return hotel.rooms[0] ?? null;
  return available.reduce((cheapest, room) =>
    room.pricePerNight < cheapest.pricePerNight ? room : cheapest
  );
}

/** Keep priceFrom aligned with the lowest room rate when saving hotels. */
export function syncHotelPriceFrom(hotel: Pick<Hotel, "priceFrom" | "rooms">): number {
  return getEffectiveHotelPriceFrom(hotel);
}
