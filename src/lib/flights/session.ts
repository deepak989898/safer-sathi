import type { CabinClass, FareType } from "@/lib/tripjack/config";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";

const SESSION_KEY = "safarsathi_flight_search";

export interface FlightSearchSession {
  params: FlightSearchParams;
  flights: NormalizedFlight[];
  onwardCount: number;
  message: string;
  searchedAt: string;
}

/** Strip heavy raw TripJack payloads so sessionStorage does not freeze the tab. */
function lightFlightsForSession(flights: NormalizedFlight[]): NormalizedFlight[] {
  return flights.map((flight) => {
    const { rawTrip: _rawTrip, rawPrice: _rawPrice, ...rest } = flight;
    return { ...rest, rawTrip: null, rawPrice: null };
  });
}

export function saveFlightSearchSession(session: FlightSearchSession): void {
  if (typeof window === "undefined") return;
  try {
    const payload: FlightSearchSession = {
      ...session,
      flights: lightFlightsForSession(session.flights),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded — keep search params only so the tab stays responsive.
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          params: session.params,
          flights: [],
          onwardCount: session.onwardCount,
          message: session.message,
          searchedAt: session.searchedAt,
        } satisfies FlightSearchSession)
      );
    } catch {
      // ignore
    }
  }
}

export function loadFlightSearchSession(): FlightSearchSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlightSearchSession;
  } catch {
    return null;
  }
}

export function defaultFlightSearchParams(): FlightSearchParams {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const departureDate = tomorrow.toISOString().slice(0, 10);

  return {
    fromCode: "DEL",
    toCode: "BOM",
    departureDate,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "ECONOMY" as CabinClass,
    pft: "REGULAR" as FareType,
    isDirectFlight: true,
    isConnectingFlight: true,
  };
}
