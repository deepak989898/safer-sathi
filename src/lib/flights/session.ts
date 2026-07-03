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

export function saveFlightSearchSession(session: FlightSearchSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
