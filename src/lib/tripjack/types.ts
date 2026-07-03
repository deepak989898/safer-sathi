import type { CabinClass, FareType } from "@/lib/tripjack/config";

export interface FlightSearchParams {
  fromCode: string;
  toCode: string;
  departureDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  pft: FareType;
  isDirectFlight: boolean;
  isConnectingFlight: boolean;
}

export interface NormalizedFlight {
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  departureAirportCode: string;
  departureCity: string;
  departureTime: string;
  departureDate: string;
  arrivalAirportCode: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalDate: string;
  durationMinutes: number;
  durationFormatted: string;
  stops: number;
  stopCities: string[];
  priceId: string;
  fareIdentifier: string;
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  refundableType: string;
  cabinBaggage: string;
  checkinBaggage: string;
  seatsRemaining: number | null;
  cabinClass: string;
  rawTrip: unknown;
  rawPrice: unknown;
}

export interface FlightSearchResult {
  flights: NormalizedFlight[];
  onwardCount: number;
  payloadShape: {
    topLevelKeys: string[];
    tripInfoKeys: string[];
  };
  rawResponse: unknown;
}
