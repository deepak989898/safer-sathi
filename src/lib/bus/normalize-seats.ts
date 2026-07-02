import type { SeatSellerSeat } from "@/lib/seatseller/types";

const MAX_GRID_DIMENSION = 30;

export function normalizeSeatSellerSeats(seats: SeatSellerSeat[] | undefined): SeatSellerSeat[] {
  if (!Array.isArray(seats)) return [];

  return seats
    .map((seat, index) => {
      let row = Number(seat.row ?? seat.rowNo);
      let column = Number(seat.column ?? seat.col ?? seat.columnNo);
      const available =
        seat.available !== false &&
        String(seat.available).toLowerCase() !== "false" &&
        String(seat.available).toLowerCase() !== "0";

      if (!Number.isFinite(row) || row <= 0 || row > MAX_GRID_DIMENSION) {
        row = Math.floor(index / 5) + 1;
      }
      if (!Number.isFinite(column) || column <= 0 || column > MAX_GRID_DIMENSION) {
        column = (index % 5) + 1;
      }

      return {
        ...seat,
        name: String(seat.name ?? seat.seatName ?? `S${index + 1}`),
        row,
        column,
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
