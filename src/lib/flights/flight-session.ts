import type { FlightSearchParams } from "@/lib/tripjack/types";

export const FLIGHT_SESSION_KEYS = {
  search: "safarsathi_flight_search",
  selectedFlight: "tripjack_selected_flight",
  selectedPrice: "tripjack_selected_price",
  searchContext: "tripjack_search_context",
  reviewResponse: "tripjack_review_response",
  reviewNormalized: "tripjack_review_normalized",
  reviewBookingId: "tripjack_review_booking_id",
  reviewPriceId: "tripjack_review_price_id",
  passengers: "tripjack_passengers",
  fareValidateRequest: "tripjack_fare_validate_request",
  fareValidateResponse: "tripjack_fare_validate_response",
  fareValidateNormalized: "tripjack_fare_validate_normalized",
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

export interface FlightPassengersSession {
  passengers: import("@/lib/tripjack/types").FlightPassengerFormRow[];
  delivery: import("@/lib/tripjack/types").FlightPassengerDeliveryForm;
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
  searchContext?: FlightSearchContext | null;
}): void {
  const { normalized, rawResponse, searchContext } = input;
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewResponse, rawResponse);
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewNormalized, normalized);
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewBookingId, normalized.bookingId);
  saveJsonSession(FLIGHT_SESSION_KEYS.reviewPriceId, normalized.priceId);
  if (searchContext) {
    saveJsonSession(FLIGHT_SESSION_KEYS.searchContext, searchContext);
  }
}

export function loadFlightReviewSession(): {
  rawResponse: unknown;
  normalized: import("@/lib/tripjack/types").NormalizedFlightReview;
  bookingId: string;
  priceId: string;
  searchContext: FlightSearchContext | null;
} | null {
  const normalized = loadJsonSession<import("@/lib/tripjack/types").NormalizedFlightReview>(
    FLIGHT_SESSION_KEYS.reviewNormalized
  );
  if (!normalized) return null;

  return {
    rawResponse: loadJsonSession<unknown>(FLIGHT_SESSION_KEYS.reviewResponse),
    normalized,
    bookingId:
      loadJsonSession<string>(FLIGHT_SESSION_KEYS.reviewBookingId) || normalized.bookingId || "",
    priceId: loadJsonSession<string>(FLIGHT_SESSION_KEYS.reviewPriceId) || normalized.priceId || "",
    searchContext: loadJsonSession<FlightSearchContext>(FLIGHT_SESSION_KEYS.searchContext),
  };
}

export function saveFareValidateSession(input: {
  request: import("@/lib/tripjack/types").FareValidateRequest;
  rawResponse: unknown;
  normalized: import("@/lib/tripjack/types").NormalizedFareValidate;
  passengers: FlightPassengersSession;
}): void {
  saveJsonSession(FLIGHT_SESSION_KEYS.passengers, input.passengers);
  saveJsonSession(FLIGHT_SESSION_KEYS.fareValidateRequest, input.request);
  saveJsonSession(FLIGHT_SESSION_KEYS.fareValidateResponse, input.rawResponse);
  saveJsonSession(FLIGHT_SESSION_KEYS.fareValidateNormalized, input.normalized);
}

export function loadFareValidateSession(): {
  passengers: FlightPassengersSession | null;
  request: import("@/lib/tripjack/types").FareValidateRequest | null;
  normalized: import("@/lib/tripjack/types").NormalizedFareValidate | null;
  fareValidateResponse: unknown;
} {
  return {
    passengers: loadJsonSession<FlightPassengersSession>(FLIGHT_SESSION_KEYS.passengers),
    request: loadJsonSession<import("@/lib/tripjack/types").FareValidateRequest>(
      FLIGHT_SESSION_KEYS.fareValidateRequest
    ),
    normalized: loadJsonSession<import("@/lib/tripjack/types").NormalizedFareValidate>(
      FLIGHT_SESSION_KEYS.fareValidateNormalized
    ),
    fareValidateResponse: loadJsonSession<unknown>(FLIGHT_SESSION_KEYS.fareValidateResponse),
  };
}

export {
  saveFlightSearchSession,
  loadFlightSearchSession,
  defaultFlightSearchParams,
  type FlightSearchSession,
} from "@/lib/flights/session";
