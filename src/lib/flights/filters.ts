import type { NormalizedFlight } from "@/lib/tripjack/types";

export const FLIGHTS_PAGE_SIZE = 15;

export type FlightSortOption =
  | "price_asc"
  | "price_desc"
  | "departure_asc"
  | "departure_desc"
  | "duration_asc";

export type FlightStopsFilter = "all" | "nonstop" | "1stop" | "2plus";

export type DepartureTimeSlot = "morning" | "afternoon" | "evening" | "night";

export interface FlightFilters {
  sortBy: FlightSortOption;
  stops: FlightStopsFilter;
  airlines: string[];
  minPrice: number;
  maxPrice: number;
  departureSlots: DepartureTimeSlot[];
  refundableOnly: boolean;
  fareTypes: string[];
}

export interface FlightFilterMeta {
  airlines: Array<{ code: string; name: string; count: number }>;
  fareTypes: Array<{ id: string; count: number }>;
  priceMin: number;
  priceMax: number;
}

export const DEFAULT_FLIGHT_FILTERS: FlightFilters = {
  sortBy: "price_asc",
  stops: "all",
  airlines: [],
  minPrice: 0,
  maxPrice: 0,
  departureSlots: [],
  refundableOnly: false,
  fareTypes: [],
};

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function departureSlot(time: string): DepartureTimeSlot {
  const minutes = parseMinutes(time);
  const hour = Math.floor(minutes / 60);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function buildFlightFilterMeta(flights: NormalizedFlight[]): FlightFilterMeta {
  const airlineMap = new Map<string, { name: string; count: number }>();
  const fareMap = new Map<string, number>();
  let priceMin = Infinity;
  let priceMax = 0;

  for (const flight of flights) {
    const code = flight.airlineCode || flight.airlineName;
    const existing = airlineMap.get(code);
    airlineMap.set(code, {
      name: flight.airlineName,
      count: (existing?.count ?? 0) + 1,
    });

    fareMap.set(flight.fareIdentifier, (fareMap.get(flight.fareIdentifier) ?? 0) + 1);

    if (flight.totalFare > 0) {
      priceMin = Math.min(priceMin, flight.totalFare);
      priceMax = Math.max(priceMax, flight.totalFare);
    }
  }

  return {
    airlines: [...airlineMap.entries()]
      .map(([code, { name, count }]) => ({ code, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    fareTypes: [...fareMap.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    priceMin: Number.isFinite(priceMin) ? Math.floor(priceMin) : 0,
    priceMax: priceMax > 0 ? Math.ceil(priceMax) : 0,
  };
}

export function initFiltersFromFlights(flights: NormalizedFlight[]): FlightFilters {
  const meta = buildFlightFilterMeta(flights);
  return {
    ...DEFAULT_FLIGHT_FILTERS,
    minPrice: meta.priceMin,
    maxPrice: meta.priceMax,
  };
}

export function applyFlightFilters(
  flights: NormalizedFlight[],
  filters: FlightFilters
): NormalizedFlight[] {
  let result = [...flights];

  if (filters.stops === "nonstop") {
    result = result.filter((f) => f.stops === 0);
  } else if (filters.stops === "1stop") {
    result = result.filter((f) => f.stops === 1);
  } else if (filters.stops === "2plus") {
    result = result.filter((f) => f.stops >= 2);
  }

  if (filters.airlines.length > 0) {
    const set = new Set(filters.airlines);
    result = result.filter((f) => set.has(f.airlineCode));
  }

  if (filters.minPrice > 0 || filters.maxPrice > 0) {
    result = result.filter((f) => {
      if (filters.minPrice > 0 && f.totalFare < filters.minPrice) return false;
      if (filters.maxPrice > 0 && f.totalFare > filters.maxPrice) return false;
      return true;
    });
  }

  if (filters.departureSlots.length > 0) {
    const slots = new Set(filters.departureSlots);
    result = result.filter((f) => slots.has(departureSlot(f.departureTime)));
  }

  if (filters.refundableOnly) {
    result = result.filter((f) => f.refundableType.toLowerCase().includes("refundable") && !f.refundableType.toLowerCase().includes("non"));
  }

  if (filters.fareTypes.length > 0) {
    const set = new Set(filters.fareTypes);
    result = result.filter((f) => set.has(f.fareIdentifier));
  }

  switch (filters.sortBy) {
    case "price_desc":
      result.sort((a, b) => b.totalFare - a.totalFare);
      break;
    case "departure_asc":
      result.sort((a, b) => parseMinutes(a.departureTime) - parseMinutes(b.departureTime));
      break;
    case "departure_desc":
      result.sort((a, b) => parseMinutes(b.departureTime) - parseMinutes(a.departureTime));
      break;
    case "duration_asc":
      result.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case "price_asc":
    default:
      result.sort(
        (a, b) =>
          a.totalFare - b.totalFare || parseMinutes(a.departureTime) - parseMinutes(b.departureTime)
      );
      break;
  }

  return result;
}

export function paginateFlights<T>(items: T[], page: number, pageSize = FLIGHTS_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
    pageSize,
    startIndex: total === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, total),
  };
}

export function countActiveFilters(filters: FlightFilters, meta: FlightFilterMeta): number {
  let count = 0;
  if (filters.stops !== "all") count += 1;
  if (filters.airlines.length > 0) count += 1;
  if (filters.minPrice > meta.priceMin || filters.maxPrice < meta.priceMax) count += 1;
  if (filters.departureSlots.length > 0) count += 1;
  if (filters.refundableOnly) count += 1;
  if (filters.fareTypes.length > 0) count += 1;
  if (filters.sortBy !== "price_asc") count += 1;
  return count;
}
