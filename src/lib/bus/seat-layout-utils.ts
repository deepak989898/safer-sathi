import type { SeatSellerSeat } from "@/lib/seatseller/types";
import { asRecord, pickFareFromRecord, pickNumber } from "@/lib/seatseller/normalize";

const MAX_GRID_DIMENSION = 40;

/** SeatSeller / redBus style names: L1, U3, A1, 12A — not layout markers. */
export function isValidBusSeatName(name: unknown): boolean {
  const value = String(name ?? "").trim();
  if (!value || value.length > 12) return false;
  if (/alert|dry-|marker|empty|aisle|passage/i.test(value)) return false;
  if (!/[a-zA-Z0-9]/.test(value)) return false;
  return true;
}

export function formatBusSeatLabel(name: string): string {
  const trimmed = String(name).trim();
  if (/^[a-z]\d+$/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  if (/^u\d+$/i.test(trimmed)) {
    return `U${trimmed.slice(1)}`;
  }
  if (/^l\d+$/i.test(trimmed)) {
    return `L${trimmed.slice(1)}`;
  }
  return trimmed.toUpperCase();
}

export interface LayoutSeat extends SeatSellerSeat {
  gridRow: number;
  gridCol: number;
  rowSpan: number;
  colSpan: number;
}

function readCoord(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_GRID_DIMENSION ? n : null;
}

/** Preserve SeatSeller 0-based row/column; only infer when truly missing. */
export function normalizeSeatSellerSeats(seats: SeatSellerSeat[] | undefined): SeatSellerSeat[] {
  if (!Array.isArray(seats)) return [];

  const valid = seats.filter((seat) => isValidBusSeatName(seat.name ?? seat.seatName));

  return valid.map((seat, index) => {
    const record = asRecord(seat);
    let row = readCoord(seat.row ?? seat.rowNo ?? record?.row ?? record?.rowNo);
    let column = readCoord(
      seat.column ?? seat.col ?? seat.columnNo ?? record?.column ?? record?.col
    );

    if (row === null) row = Math.floor(index / 4);
    if (column === null) column = index % 4;

    const available =
      seat.available !== false &&
      String(seat.available).toLowerCase() !== "false" &&
      String(seat.available).toLowerCase() !== "0";

    const rawName = String(
      seat.name ?? seat.seatName ?? record?.name ?? record?.seatName ?? `S${index + 1}`
    );

    const fare = record ? pickFareFromRecord(record) : undefined;

    return {
      ...seat,
      name: formatBusSeatLabel(rawName),
      row,
      column,
      zIndex: pickNumber(record ?? {}, ["zIndex", "z_index", "deck"], 0) ?? 0,
      length: Math.max(1, pickNumber(record ?? {}, ["length", "rowSpan"], 1) ?? 1),
      width: Math.max(1, pickNumber(record ?? {}, ["width", "colSpan"], 1) ?? 1),
      available,
      ladiesSeat:
        seat.ladiesSeat === true || String(seat.ladiesSeat).toLowerCase() === "true",
      malesSeat: seat.malesSeat === true || String(seat.malesSeat).toLowerCase() === "true",
      fare: fare !== undefined && fare > 0 ? fare : undefined,
    };
  });
}

/** Map API row/column (0-based, with aisle gaps) into a compact CSS grid per deck. */
export function buildDeckLayout(seats: SeatSellerSeat[]): {
  seats: LayoutSeat[];
  rows: number;
  cols: number;
  aisleAfterCol: number | null;
} {
  if (!seats.length) return { seats: [], rows: 0, cols: 0, aisleAfterCol: null };

  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  const cols = [...new Set(seats.map((s) => s.column))].sort((a, b) => a - b);

  const rowMap = new Map(rows.map((r, i) => [r, i + 1]));
  const colMap = new Map(cols.map((c, i) => [c, i + 1]));

  let aisleAfterCol: number | null = null;
  if (cols.length >= 3) {
    let maxGap = 0;
    for (let i = 0; i < cols.length - 1; i += 1) {
      const gap = cols[i + 1] - cols[i];
      if (gap > maxGap) {
        maxGap = gap;
        aisleAfterCol = colMap.get(cols[i]) ?? null;
      }
    }
  }

  const layoutSeats: LayoutSeat[] = seats.map((seat) => ({
    ...seat,
    gridRow: rowMap.get(seat.row) ?? 1,
    gridCol: colMap.get(seat.column) ?? 1,
    rowSpan: Math.max(1, seat.length),
    colSpan: Math.max(1, seat.width),
  }));

  return {
    seats: layoutSeats,
    rows: rows.length,
    cols: cols.length,
    aisleAfterCol,
  };
}

export function splitSeatsByDeck(seats: SeatSellerSeat[]): {
  lower: SeatSellerSeat[];
  upper: SeatSellerSeat[];
  isSleeper: boolean;
} {
  const upper = seats.filter((s) => (s.zIndex ?? 0) > 0);
  const lower = seats.filter((s) => (s.zIndex ?? 0) === 0);
  return {
    lower: lower.length ? lower : seats,
    upper,
    isSleeper: upper.length > 0,
  };
}
