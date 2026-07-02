import type { SeatSellerSeat, SeatSellerTripDetails } from "@/lib/seatseller/types";
import { normalizeSeatSellerSeats } from "@/lib/bus/normalize-seats";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickSeatsArray(record: Record<string, unknown>): unknown[] {
  for (const key of ["seats", "Seats", "seatList", "seatDetails", "seatLayout"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function collectNestedSeats(record: Record<string, unknown>): unknown[] {
  const collected: unknown[] = [];

  for (const key of ["tripdetails", "tripDetails", "tripdetail", "data", "result"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const itemRecord = asRecord(item);
        if (!itemRecord) continue;
        collected.push(...pickSeatsArray(itemRecord));
      }
    } else {
      const nestedRecord = asRecord(nested);
      if (nestedRecord) collected.push(...pickSeatsArray(nestedRecord));
    }
  }

  return collected;
}

export function parseSeatSellerTripDetails(raw: unknown): SeatSellerTripDetails {
  const record = asRecord(raw);
  if (!record) {
    return {
      availableTripId: "",
      maxSeatsPerTicket: 6,
      seats: [],
    };
  }

  const directSeats = pickSeatsArray(record);
  const nestedSeats = directSeats.length ? [] : collectNestedSeats(record);
  const allSeats = directSeats.length ? directSeats : nestedSeats;

  if (allSeats.length) {
    return {
      ...record,
      availableTripId: String(record.availableTripId ?? record.id ?? ""),
      maxSeatsPerTicket: Number(record.maxSeatsPerTicket ?? 6) || 6,
      callFareBreakupApi:
        record.callFareBreakupApi === true ||
        String(record.callFareBreakupApi).toLowerCase() === "true",
      forcedSeats: Array.isArray(record.forcedSeats)
        ? record.forcedSeats.map(String)
        : undefined,
      seats: normalizeSeatSellerSeats(allSeats as SeatSellerSeat[]),
    };
  }

  for (const key of ["tripdetails", "tripDetails", "tripdetail", "data", "result"]) {
    const nested = record[key];
    if (Array.isArray(nested) && nested[0]) {
      return parseSeatSellerTripDetails(nested[0]);
    }
    const nestedRecord = asRecord(nested);
    if (nestedRecord) {
      const parsed = parseSeatSellerTripDetails(nestedRecord);
      if (parsed.seats.length) return parsed;
    }
  }

  return {
    availableTripId: String(record.availableTripId ?? record.id ?? ""),
    maxSeatsPerTicket: Number(record.maxSeatsPerTicket ?? 6) || 6,
    seats: [],
    forcedSeats: Array.isArray(record.forcedSeats)
      ? record.forcedSeats.map(String)
      : undefined,
  };
}

export function parseSeatSellerBpDp(raw: unknown): {
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
} {
  const record = asRecord(raw);
  if (!record) {
    return { boardingPoints: [], droppingPoints: [] };
  }

  const boardingRaw =
    record.boardingPoints ??
    record.boardingpoints ??
    record.boardingTimes ??
    record.bpList ??
    [];
  const droppingRaw =
    record.droppingPoints ??
    record.droppingpoints ??
    record.droppingTimes ??
    record.dpList ??
    [];

  const mapPoints = (items: unknown) =>
    (Array.isArray(items) ? items : [])
      .map((item, index) => {
        const row = asRecord(item);
        if (!row) return null;
        const id = String(row.id ?? row.bpId ?? row.dpId ?? row.pointId ?? index + 1);
        const location = String(row.location ?? row.bpName ?? row.name ?? row.address ?? "Point");
        const time = String(row.time ?? row.bpTime ?? row.dpTime ?? "");
        return { id, location, time };
      })
      .filter((point): point is { id: string; location: string; time: string } => Boolean(point?.id));

  return {
    boardingPoints: mapPoints(boardingRaw),
    droppingPoints: mapPoints(droppingRaw),
  };
}
