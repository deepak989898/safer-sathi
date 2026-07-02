/** SeatSeller / RedBus API response shapes (partial — API may return extra fields). */

export interface SeatSellerCity {
  id: string;
  name: string;
  state?: string;
  stateId?: string;
  latitude?: number;
  longitude?: number;
}

export interface SeatSellerAlias {
  id: string;
  cityName: string;
  aliasNames: string[];
}

export interface SeatSellerTrip {
  id: string;
  travels: string;
  busType: string;
  busTypeId?: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  fares?: Record<string, number> | number[];
  fareDetails?: Array<{ baseFare: number; totalFare: number; serviceTax?: number }>;
  AC?: boolean;
  seater?: boolean;
  sleeper?: boolean;
  mTicketEnabled?: boolean;
  cancellationPolicy?: string;
  maxSeatsPerTicket?: number;
  callFareBreakupApi?: boolean;
  operator?: string;
  duration?: string;
  bpDpSeatLayout?: string | boolean;
  [key: string]: unknown;
}

export interface SeatSellerSeat {
  name: string;
  row: number;
  column: number;
  zIndex: number;
  length: number;
  width: number;
  available: boolean;
  ladiesSeat?: boolean;
  malesSeat?: boolean;
  fare?: number;
  baseFare?: number;
  serviceTaxAbsolute?: number;
  operatorServiceChargeAbsolute?: number;
  [key: string]: unknown;
}

export interface SeatSellerTripDetails {
  availableTripId: string;
  maxSeatsPerTicket: number;
  callFareBreakupApi?: boolean;
  seats: SeatSellerSeat[];
  forcedSeats?: string[];
  [key: string]: unknown;
}

export interface BusAliasRecord {
  id: string;
  cityName: string;
  aliasNames: string[];
  syncedAt: string;
}

export interface SeatSellerBoardingPoint {
  id: string;
  location: string;
  time: string;
  landmark?: string;
  address?: string;
  contactNumber?: string;
}

export interface SeatSellerDroppingPoint {
  id: string;
  location: string;
  time: string;
  landmark?: string;
  address?: string;
}

export interface SeatSellerBpDpDetails {
  boardingPoints: SeatSellerBoardingPoint[];
  droppingPoints: SeatSellerDroppingPoint[];
}

export interface SeatSellerBlockTicketResponse {
  blockKey: string;
  expiresIn?: number;
  fare?: number;
  [key: string]: unknown;
}

export interface SeatSellerBookTicketResponse {
  tin: string;
  pnr: string;
  status?: string;
  [key: string]: unknown;
}

export interface SeatSellerUpdatedFareResponse {
  totalFare: number;
  baseFare?: number;
  taxes?: number;
  serviceCharge?: number;
  [key: string]: unknown;
}

export interface SeatSellerCancellationData {
  refundableAmount: number;
  cancellationCharges: number;
  cancelable?: boolean;
  [key: string]: unknown;
}

export type BusIdType =
  | "PAN_CARD"
  | "VOTER_CARD"
  | "PASSPORT"
  | "DRIVING_LICENCE"
  | "RATION_CARD"
  | "AADHAR";

export type BusPassengerGender = "MALE" | "FEMALE";

export interface BusPassengerDetail {
  title: string;
  name: string;
  age: number;
  gender: BusPassengerGender;
  mobile: string;
  email: string;
  idType: BusIdType;
  idNumber: string;
  address: string;
  seatName: string;
  ladiesSeat: boolean;
  fare: number;
}

export type BusBookingStatus =
  | "initiated"
  | "seat_blocked"
  | "payment_pending"
  | "payment_success"
  | "confirmed"
  | "payment_failed"
  | "confirmation_failed"
  | "manual_review_required"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export interface BusBookingRecord {
  bookingId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  sourceCityId: string;
  sourceCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  doj: string;
  tripId: string;
  operatorName: string;
  busType: string;
  seatNames: string[];
  boardingPoint: { id: string; location: string; time: string };
  droppingPoint: { id: string; location: string; time: string };
  passengerDetails: BusPassengerDetail[];
  baseFare: number;
  taxes: number;
  totalFare: number;
  blockKey?: string;
  blockExpiresAt?: string;
  tin?: string;
  pnr?: string;
  status: BusBookingStatus;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cancellationPolicy?: string;
  refundAmount?: number;
  cancellationCharges?: number;
  callFareBreakupApi?: boolean;
  adminNotes?: string;
  apiResponses?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BusCityRecord {
  id: string;
  name: string;
  state?: string;
  syncedAt: string;
}

export interface BusApiLog {
  id: string;
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  bookingId?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
  createdAt: string;
}
