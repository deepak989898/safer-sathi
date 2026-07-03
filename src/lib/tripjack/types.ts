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
  bookingId: string;
  rawReviewResponse: unknown;
}

export interface FlightReviewResult {
  review: NormalizedFlightReview;
  rawResponse: unknown;
}

export type PassengerTitle = "Mr" | "Ms" | "Mrs" | "Mstr" | "Miss";
export type PassengerType = "ADULT" | "CHILD" | "INFANT";

export interface TripJackSsrItem {
  key: string;
  code: string;
}

export interface TripJackTravellerPayload {
  ti: PassengerTitle;
  pt: PassengerType;
  fN: string;
  lN: string;
  ssrBaggageInfos?: TripJackSsrItem[];
  ssrMealInfos?: TripJackSsrItem[];
  ssrSeatInfos?: TripJackSsrItem[];
  ssrFastForwardInfos?: TripJackSsrItem[];
}

export interface TripJackDeliveryInfoPayload {
  emails: string[];
  contacts: string[];
  code: string[];
}

export interface FareValidateRequest {
  travellerInfo: TripJackTravellerPayload[];
  bookingId: string;
  deliveryInfo: TripJackDeliveryInfoPayload;
}

export interface FlightPassengerFormRow {
  ti: PassengerTitle;
  pt: PassengerType;
  fN: string;
  lN: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  ssrBaggageInfos?: TripJackSsrItem[];
  ssrMealInfos?: TripJackSsrItem[];
  ssrSeatInfos?: TripJackSsrItem[];
  ssrFastForwardInfos?: TripJackSsrItem[];
}

export interface FlightPassengerDeliveryForm {
  email: string;
  contact: string;
  countryCode: string;
}

export interface NormalizedFareValidate {
  bookingId: string;
  tripInfos: unknown[];
  segments: FlightReviewSegment[];
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  departureAirportCode: string;
  departureCity: string;
  departureTime: string;
  arrivalAirportCode: string;
  arrivalCity: string;
  arrivalTime: string;
  durationMinutes: number;
  durationFormatted: string;
  totalFare: number;
  baseFare: number;
  taxesAndFees: number;
  netFare: number;
  fareIdentifier: string;
  priceId: string;
  refundableType: string;
  baggage: { cabin: string; checkin: string };
  ssrInfo: unknown;
  travellerInfo: TripJackTravellerPayload[];
  deliveryInfo: TripJackDeliveryInfoPayload;
  fareChanged: boolean;
  fareAlertMessage: string | null;
  rawFareValidateResponse: unknown;
}

export interface FareValidateResult {
  validated: NormalizedFareValidate;
  rawResponse: unknown;
}
