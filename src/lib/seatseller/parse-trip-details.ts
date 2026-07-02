import type { SeatSellerSeat, SeatSellerTripDetails } from "@/lib/seatseller/types";
import { normalizeSeatSellerSeats } from "@/lib/bus/seat-layout-utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatPointTime(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim();
  if (raw.includes(":")) return raw;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return raw;
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

function mapBoardingPoints(items: unknown) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = String(row.id ?? row.bpId ?? row.Id ?? row.pointId ?? index + 1);
      const landmark = String(row.landmark ?? row.Landmark ?? "").trim();
      const address = String(row.address ?? row.Address ?? row.bpAddress ?? "").trim();
      const name = String(
        row.location ??
          row.bpName ??
          row.BpName ??
          row.name ??
          row.Name ??
          landmark ??
          address ??
          ""
      ).trim();

      const location =
        name && name !== id
          ? name
          : landmark || address || `Boarding point ${index + 1}`;

      const time = formatPointTime(
        row.time ?? row.bpTime ?? row.BpTime ?? row.bpTimeString ?? row.Tm
      );

      return { id, location, time };
    })
    .filter((point): point is { id: string; location: string; time: string } =>
      Boolean(point?.id)
    );
}

function mapDroppingPoints(items: unknown) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = String(row.id ?? row.dpId ?? row.Id ?? row.pointId ?? index + 1);
      const landmark = String(row.landmark ?? row.Landmark ?? "").trim();
      const address = String(row.address ?? row.Address ?? row.dpAddress ?? "").trim();
      const name = String(
        row.location ??
          row.dpName ??
          row.DpName ??
          row.name ??
          row.Name ??
          landmark ??
          address ??
          ""
      ).trim();

      const location =
        name && name !== id
          ? name
          : landmark || address || `Dropping point ${index + 1}`;

      const time = formatPointTime(
        row.time ?? row.dpTime ?? row.DpTime ?? row.dpTimeString ?? row.Tm
      );

      return { id, location, time };
    })
    .filter((point): point is { id: string; location: string; time: string } =>
      Boolean(point?.id)
    );
}

export function parseSeatSellerBpDp(raw: unknown): {
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
} {
  const record = asRecord(raw);
  if (!record) {
    return { boardingPoints: [], droppingPoints: [] };
  }

  for (const key of ["bpdpdetails", "bpDpDetails", "data", "result"]) {
    const nested = asRecord(record[key]);
    if (
      nested &&
      (nested.boardingPoints ||
        nested.boardingpoints ||
        nested.boardingTimes ||
        nested.droppingPoints ||
        nested.droppingpoints ||
        nested.droppingTimes)
    ) {
      return parseSeatSellerBpDp(nested);
    }
  }

  const boardingRaw =
    record.boardingPoints ??
    record.boardingpoints ??
    record.BoardingPoints ??
    record.boardingTimes ??
    record.bpList ??
    record.BPLt ??
    [];

  const droppingRaw =
    record.droppingPoints ??
    record.droppingpoints ??
    record.DroppingPoints ??
    record.droppingTimes ??
    record.dpList ??
    record.DPLt ??
    [];

  const boardingPoints = mapBoardingPoints(boardingRaw);
  const droppingPoints = mapDroppingPoints(droppingRaw);

  return { boardingPoints, droppingPoints };
}

export function parseTripEmbeddedBpDp(trip: Record<string, unknown> | null | undefined): {
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
} {
  if (!trip) return { boardingPoints: [], droppingPoints: [] };
  return {
    boardingPoints: mapBoardingPoints(trip.boardingTimes ?? trip.boarding_times),
    droppingPoints: mapDroppingPoints(trip.droppingTimes ?? trip.dropping_times),
  };
}
