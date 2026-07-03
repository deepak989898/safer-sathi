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

export interface FlightReviewSegment {
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  isLcc: boolean;
  departureAirportCode: string;
  departureAirportName: string;
  departureCity: string;
  departureTerminal: string;
  departureTime: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalTerminal: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface PaxFareLine {
  type: "ADULT" | "CHILD" | "INFANT";
  count: number;
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  netFare: number;
}

export interface NormalizedFlightReview {
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  isLcc: boolean;
  departureAirportCode: string;
  departureAirportName: string;
  departureCity: string;
  departureTerminal: string;
  departureTime: string;
  departureDate: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalTerminal: string;
  arrivalTime: string;
  arrivalDate: string;
  durationMinutes: number;
  durationFormatted: string;
  stops: number;
  segments: FlightReviewSegment[];
  priceId: string;
  fareIdentifier: string;
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  netFare: number;
  paxFares: PaxFareLine[];
  refundableType: string;
  cabinClass: string;
  cabinBaggage: string;
  checkinBaggage: string;
  seatsRemaining: number | null;
  ssrInfo: unknown;
  fareUpdated: boolean;
  fareAlertMessage: string | null;
  rawReviewResponse: unknown;
}

export interface FlightReviewResult {
  review: NormalizedFlightReview;
  rawResponse: unknown;
}
