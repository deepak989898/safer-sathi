import type { SeatSellerSeat } from "@/lib/seatseller/types";

export function normalizeSeatSellerSeats(seats: SeatSellerSeat[] | undefined): SeatSellerSeat[] {
  if (!Array.isArray(seats)) return [];

  return seats
    .map((seat, index) => {
      const row = Number(seat.row);
      const column = Number(seat.column);
      const available =
        seat.available !== false &&
        String(seat.available).toLowerCase() !== "false" &&
        String(seat.available).toLowerCase() !== "0";

      return {
        ...seat,
        name: String(seat.name ?? seat.seatName ?? `S${index + 1}`),
        row: Number.isFinite(row) && row > 0 ? row : Math.floor(index / 4) + 1,
        column: Number.isFinite(column) && column > 0 ? column : (index % 4) + 1,
        zIndex: Number(seat.zIndex ?? 0) || 0,
        length: Number(seat.length ?? 1) || 1,
        width: Number(seat.width ?? 1) || 1,
        available,
        ladiesSeat:
          seat.ladiesSeat === true || String(seat.ladiesSeat).toLowerCase() === "true",
        malesSeat: seat.malesSeat === true || String(seat.malesSeat).toLowerCase() === "true",
        fare: Number(seat.fare ?? seat.baseFare ?? 0) || undefined,
      };
    })
    .filter((seat) => Boolean(seat.name));
}
