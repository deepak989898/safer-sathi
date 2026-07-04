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

/** Lightweight flight list for UI/session — no heavy nested objects. */
export function lightFlights(flights: NormalizedFlight[]): NormalizedFlight[] {
  return flights.map((flight) => ({
    ...flight,
    rawTrip: null,
    rawPrice: null,
  }));
}

export function saveFlightSearchSession(session: FlightSearchSession): void {
  if (typeof window === "undefined") return;
  // Persist params only — saving 200+ flights blocks the main thread.
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
    // ignore quota errors
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
