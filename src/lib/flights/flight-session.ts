import type { FlightSearchParams } from "@/lib/tripjack/types";

export const FLIGHT_SESSION_KEYS = {
  search: "safarsathi_flight_search",
  selectedFlight: "tripjack_selected_flight",
  selectedPrice: "tripjack_selected_price",
  searchContext: "tripjack_search_context",
  reviewResponse: "tripjack_review_response",
  reviewNormalized: "tripjack_review_normalized",
} as const;

export interface FlightSearchContext {
  params: FlightSearchParams;
  priceId: string;
  searchTotalFare?: number;
  selectedAt: string;
}

export interface FlightSelectedFlight {
  normalized: import("@/lib/tripjack/types").NormalizedFlight;
  rawTrip: unknown;
}

export interface FlightSelectedPrice {
  priceId: string;
  rawPrice: unknown;
  fareIdentifier: string;
  totalFare: number;
}

export function saveJsonSession(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function loadJsonSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveFlightSelection(input: {
  flight: import("@/lib/tripjack/types").NormalizedFlight;
  params: FlightSearchParams;
}): void {
  const { flight, params } = input;
  saveJsonSession(FLIGHT_SESSION_KEYS.selectedFlight, {
    normalized: flight,
    rawTrip: flight.rawTrip,
  } satisfies FlightSelectedFlight);
  saveJsonSession(FLIGHT_SESSION_KEYS.selectedPrice, {
    priceId: flight.priceId,
    rawPrice: flight.rawPrice,
    fareIdentifier: flight.fareIdentifier,
    totalFare: flight.totalFare,
  } satisfies FlightSelectedPrice);
  saveJsonSession(FLIGHT_SESSION_KEYS.searchContext, {
    params,
    priceId: flight.priceId,
    searchTotalFare: flight.totalFare,
    selectedAt: new Date().toISOString(),
  } satisfies FlightSearchContext);
}

export function loadFlightSelection(): {
  flight: FlightSelectedFlight | null;
  price: FlightSelectedPrice | null;
  context: FlightSearchContext | null;
} {
  return {
    flight: loadJsonSession<FlightSelectedFlight>(FLIGHT_SESSION_KEYS.selectedFlight),
    price: loadJsonSession<FlightSelectedPrice>(FLIGHT_SESSION_KEYS.selectedPrice),
    context: loadJsonSession<FlightSearchContext>(FLIGHT_SESSION_KEYS.searchContext),
  };
}

export function saveFlightReviewSession(input: {
  rawResponse: unknown;
  normalized: import("@/lib/tripjack/types").NormalizedFlightReview;
}): void {
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewResponse, input.rawResponse);
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewNormalized, input.normalized);
}

export function loadFlightReviewSession(): {
  rawResponse: unknown;
  normalized: import("@/lib/tripjack/types").NormalizedFlightReview;
} | null {
  const normalized = loadJsonSession<import("@/lib/tripjack/types").NormalizedFlightReview>(
    FLIGHT_SESSION_KEYS.reviewNormalized
  );
  const rawResponse = loadJsonSession<unknown>(FLIGHT_SESSION_KEYS.reviewResponse);
  if (!normalized) return null;
  return { rawResponse, normalized };
}

// Re-export search session helpers (existing key)
export {
  saveFlightSearchSession,
  loadFlightSearchSession,
  defaultFlightSearchParams,
  type FlightSearchSession,
} from "@/lib/flights/session";
