import type {
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedCancellationCharges,
  NormalizedFareValidate,
  NormalizedFlightBookingDetails,
  NormalizedFlightReview,
  NormalizedPollAmendment,
} from "@/lib/tripjack/types";

export type FlightBookingStatus =
  | "fare_validated"
  | "payment_pending"
  | "payment_success"
  | "payment_failed"
  | "payment_received_booking_failed"
  | "booking_pending"
  | "confirmed"
  | "booking_failed"
  | "manual_review_required"
  | "cancellation_requested"
  | "cancelled"
  | "refund_pending"
  | "refund_completed"
  | "hold"
  | "released";

export type FlightPaymentStatus = "pending" | "paid" | "failed" | "refunded" | "refund_pending";

export type FlightRefundStatus =
  | "none"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type FlightPollStatus = "idle" | "polling" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface FlightAdminNote {
  note: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

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
  idempotencyKey?: string;
  bookingLock?: boolean;
  bookInProgressAt?: string;
  bookAttemptedAt?: string;
  bookError?: string;
  bookingDetailsPollAttempts?: number;
  bookingDetailsPollStatus?: string;
  emailSentAt?: string;
  invoiceSentAt?: string;
  reviewNormalized?: NormalizedFlightReview;
  fareValidateNormalized?: NormalizedFareValidate;
  fareValidateRequest?: unknown;
  fareValidateResponse?: unknown;
  reviewResponse?: unknown;
  bookRequest?: unknown;
  bookResponse?: unknown;
  bookingDetailsResponse?: unknown;
  bookingDetailResponse?: unknown;
  bookingDetailNormalized?: NormalizedFlightBookingDetails;
  normalizedBookingDetails?: NormalizedFlightBookingDetails;
  amendmentId?: string;
  cancellationCharges?: number;
  refundAmount?: number;
  refundStatus?: FlightRefundStatus;
  pollStatus?: FlightPollStatus;
  releasePNRStatus?: string;
  cancellationChargesNormalized?: NormalizedCancellationCharges;
  getChargesRequest?: unknown;
  getChargesResponse?: unknown;
  submitAmendmentRequest?: unknown;
  submitAmendmentResponse?: unknown;
  pollAmendmentResponse?: unknown;
  pollAmendmentNormalized?: NormalizedPollAmendment;
  releasePnrRequest?: unknown;
  releasePnrResponse?: unknown;
  isHoldBooking?: boolean;
  /** @deprecated use adminNotesHistory — kept for older records */
  adminNotes?: string | FlightAdminNote[];
  adminNotesHistory?: FlightAdminNote[];
  manualReviewResolved?: boolean;
  manualReviewResolvedBy?: string;
  manualReviewResolvedAt?: string;
  lastAdminAction?: string;
  lastAdminActionAt?: string;
  createdAt: string;
  updatedAt: string;
}
