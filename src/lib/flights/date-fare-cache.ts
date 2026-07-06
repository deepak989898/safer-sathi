import type { NormalizedFlight } from "@/lib/tripjack/types";

export type DateFareCache = Record<string, number | null>;

export function buildFlightDateStrip(centerDate: string, span = 3): string[] {
  const base = new Date(`${centerDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return [centerDate];
  const dates: string[] = [];
  for (let offset = -span; offset <= span; offset += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function minFlightFare(flights: NormalizedFlight[]): number | null {
  if (!flights.length) return null;
  const fares = flights.map((f) => f.totalFare).filter((f) => Number.isFinite(f) && f > 0);
  if (!fares.length) return null;
  return Math.min(...fares);
}

export function updateDateFareCache(
  cache: DateFareCache,
  date: string,
  flights: NormalizedFlight[]
): DateFareCache {
  return { ...cache, [date]: minFlightFare(flights) };
}

export function adjacentDatesForPrefetch(centerDate: string): string[] {
  return buildFlightDateStrip(centerDate).filter((d) => d !== centerDate);
}
