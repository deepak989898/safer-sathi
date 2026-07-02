import type { SeatSellerTrip } from "@/lib/seatseller/types";

function formatSeatSellerMinutes(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim();
  if (raw.includes(":")) return raw;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return raw;
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeTrip(raw: Record<string, unknown>): SeatSellerTrip {
  const travels =
    String(raw.travels ?? raw.operatorName ?? raw.operator_name ?? raw.busRoutes ?? "").trim() ||
    "Bus Operator";

  const fareDetails = Array.isArray(raw.fareDetails)
    ? raw.fareDetails
    : Array.isArray(raw.fare_details)
      ? raw.fare_details
      : undefined;

  const fares = raw.fares ?? raw.fare;

  return {
    ...raw,
    id: String(raw.id ?? raw.tripId ?? raw.inventoryId ?? ""),
    travels,
    operator: String(raw.operator ?? raw.operatorName ?? travels),
    busType: String(raw.busType ?? raw.bus_type ?? "Bus"),
    busTypeId: raw.busTypeId ? String(raw.busTypeId) : undefined,
    departureTime: formatSeatSellerMinutes(raw.departureTime ?? raw.departure_time),
    arrivalTime: formatSeatSellerMinutes(raw.arrivalTime ?? raw.arrival_time),
    availableSeats: asNumber(raw.availableSeats ?? raw.available_seats) ?? 0,
    AC: asBoolean(raw.AC ?? raw.ac),
    seater: asBoolean(raw.seater),
    sleeper: asBoolean(raw.sleeper),
    mTicketEnabled: asBoolean(raw.mTicketEnabled ?? raw.mTicket),
    maxSeatsPerTicket: asNumber(raw.maxSeatsPerTicket ?? raw.max_seats_per_ticket) ?? 6,
    callFareBreakupApi: asBoolean(raw.callFareBreakupApi ?? raw.call_fare_breakup_api),
    bpDpSeatLayout: (raw.bpDpSeatLayout ?? raw.bp_dp_seat_layout) as SeatSellerTrip["bpDpSeatLayout"],
    cancellationPolicy: raw.cancellationPolicy
      ? String(raw.cancellationPolicy)
      : undefined,
    duration: raw.duration ? String(raw.duration) : undefined,
    fareDetails: fareDetails as SeatSellerTrip["fareDetails"],
    fares: fares as SeatSellerTrip["fares"],
    boardingTimes: (raw.boardingTimes ?? raw.boarding_times) as SeatSellerTrip["boardingTimes"],
    droppingTimes: (raw.droppingTimes ?? raw.dropping_times) as SeatSellerTrip["droppingTimes"],
  };
}

export function parseSeatSellerTrips(rawResponse: unknown): {
  trips: SeatSellerTrip[];
  responseKeys: string[];
} {
  if (!rawResponse) return { trips: [], responseKeys: [] };
  if (Array.isArray(rawResponse)) {
    return {
      trips: rawResponse
        .filter((item) => item && typeof item === "object")
        .map((item) => normalizeTrip(item as Record<string, unknown>))
        .filter((trip) => Boolean(trip.id)),
      responseKeys: [],
    };
  }

  if (typeof rawResponse !== "object") {
    return { trips: [], responseKeys: [] };
  }

  const record = rawResponse as Record<string, unknown>;
  const responseKeys = Object.keys(record);
  const candidateKeys = [
    "availableTrips",
    "availabletrips",
    "trips",
    "availableTrip",
    "data",
    "result",
  ];

  for (const key of candidateKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return {
        trips: value
          .filter((item) => item && typeof item === "object")
          .map((item) => normalizeTrip(item as Record<string, unknown>))
          .filter((trip) => Boolean(trip.id)),
        responseKeys,
      };
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = parseSeatSellerTrips(value);
      if (nested.trips.length) return nested;
    }
  }

  return { trips: [], responseKeys };
}
