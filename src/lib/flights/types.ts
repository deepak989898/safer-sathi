import type {
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightBookingDetails,
  NormalizedFlightReview,
} from "@/lib/tripjack/types";

export type FlightBookingStatus =
  | "fare_validated"
  | "payment_pending"
  | "payment_success"
  | "payment_failed"
  | "booking_pending"
  | "confirmed"
  | "booking_failed"
  | "manual_review_required";

export type FlightPaymentStatus = "pending" | "paid" | "failed";

export interface FlightBookingRecord {
  bookingId: string;
  tripjackBookingId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  tripType: "one_way";
  sourceCode: string;
  destinationCode: string;
  sourceCity: string;
  destinationCity: string;
  travelDate: string;
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  durationFormatted: string;
  passengers: FlightPassengerFormRow[];
  delivery: FlightPassengerDeliveryForm;
  totalFare: number;
  baseFare: number;
  taxesAndFees: number;
  priceId: string;
  fareIdentifier: string;
  pnr?: string;
  airlinePnr?: string;
  ticketNumber?: string;
  ticketStatus?: string;
  tripjackStatus?: string;
  orderStatus?: string;
  status: FlightBookingStatus;
  paymentStatus: FlightPaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified?: boolean;
  reviewNormalized?: NormalizedFlightReview;
  fareValidateNormalized?: NormalizedFareValidate;
  fareValidateRequest?: unknown;
  fareValidateResponse?: unknown;
  reviewResponse?: unknown;
  bookRequest?: unknown;
  bookResponse?: unknown;
  bookingDetailsResponse?: unknown;
  normalizedBookingDetails?: NormalizedFlightBookingDetails;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}
