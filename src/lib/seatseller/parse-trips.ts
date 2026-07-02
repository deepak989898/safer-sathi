import type { SeatSellerTrip } from "@/lib/seatseller/types";
import { normalizeBusTrip } from "@/lib/bus/fare-utils";

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

function normalizeTrip(raw: Record<string, unknown>): SeatSellerTrip {
  const normalized = normalizeBusTrip(raw);
  return {
    ...normalized,
    departureTime: formatSeatSellerMinutes(raw.departureTime ?? raw.departure_time) || normalized.departureTime,
    arrivalTime: formatSeatSellerMinutes(raw.arrivalTime ?? raw.arrival_time) || normalized.arrivalTime,
    duration: raw.duration ? String(raw.duration) : normalized.duration,
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
