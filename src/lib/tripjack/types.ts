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
  airlineLogoUrl?: string;
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
  airlineLogoUrl?: string;
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

/** TripJack review `conditions` flags (seat assignable, hold, etc.). */
export interface TripJackReviewConditions {
  isa?: boolean;
  isHoldAllowed?: boolean;
  sessionExpiry?: string;
  fareChanged?: boolean;
  raw?: Record<string, unknown>;
}

export interface NormalizedFlightReview {
  airlineName: string;
  airlineCode: string;
  airlineLogoUrl?: string;
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
  conditions?: TripJackReviewConditions;
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
  dob?: string;
  pNat?: string;
  pNum?: string;
  pid?: string;
  eD?: string;
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
  airlineLogoUrl?: string;
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
  fareUnavailable?: boolean;
  fareAlertMessage: string | null;
  rawFareValidateResponse: unknown;
}

export interface FareValidateResult {
  validated: NormalizedFareValidate;
  rawResponse: unknown;
}

export interface NormalizedBookingPassenger {
  title: string;
  firstName: string;
  lastName: string;
  name: string;
  type: string;
  pnr?: string;
  ticketNumber?: string;
  status?: string;
  fare?: {
    baseFare: number;
    taxesAndFees: number;
    totalFare: number;
  };
}

export interface NormalizedFlightBookingDetails {
  bookingId: string;
  orderStatus: string;
  amount: number;
  markup: number;
  pnr: string;
  airlinePnr: string;
  ticketNumber: string;
  passengers: NormalizedBookingPassenger[];
  tripInfos: unknown[];
  flightSegments: FlightReviewSegment[];
  fareDetails: {
    baseFare: number;
    taxesAndFees: number;
    totalFare: number;
    netFare: number;
    fareIdentifier: string;
  };
  gstInfo: Record<string, unknown>;
  deliveryInfo: { emails: string[]; contacts: string[] };
  isHoldBooking: boolean;
  timeLimit: string;
  ticketStatus: string;
  tripStatus: string;
  passengerFares: Array<{
    name: string;
    type: string;
    baseFare: number;
    taxesAndFees: number;
    totalFare: number;
  }>;
  rawBookingResponse: unknown;
  rawBookingDetailsResponse: unknown;
}

export interface FlightBookResult {
  bookingId: string;
  rawResponse: unknown;
}

/** From GetCharges sample (Complete_Trip / SelectedTrip). */
export interface NormalizedCancellationCharges {
  bookingId: string;
  trips: Array<{
    src: string;
    dest: string;
    departureDate: string;
    flightNumbers: string[];
    airlines: string[];
    paxCharges: Array<{
      type: string;
      amendmentCharges: number;
      refundAmount: number;
      totalFare: number;
    }>;
  }>;
  cancellationCharges: number;
  refundAmount: number;
  refundableAmount: number;
  refundable: boolean;
  airlineCharges: number;
  supplierCharges: number;
  convenienceFee: number;
  totalRefund: number;
  cancellationDeadline?: string;
  currency: string;
  rawResponse: unknown;
}

/** From SubmitAmendment sample response. */
export interface NormalizedSubmitAmendment {
  bookingId: string;
  amendmentId: string;
  success: boolean;
  rawResponse: unknown;
}

/** From Poll Amendment sample response. */
export interface NormalizedPollAmendment {
  bookingId: string;
  amendmentId: string;
  amendmentStatus: string;
  amendmentCharges: number;
  refundableAmount: number;
  trips: unknown[];
  rawResponse: unknown;
}
