import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { HotelRoomRequest } from "@/lib/tripjack-hotels/types";

export type HotelBookingStatus =
  | "review_confirmed"
  | "payment_pending"
  | "payment_success"
  | "payment_failed"
  | "booking_pending"
  | "confirmed"
  | "booking_failed"
  | "manual_review_required"
  | "cancellation_requested"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export type HotelPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type HotelCancellationStatus =
  | "NONE"
  | "REQUESTED"
  | "CANCELLED"
  | "FAILED"
  | "NOT_ALLOWED";

export type HotelRefundStatus =
  | "NONE"
  | "PENDING"
  | "PROCESSING"
  | "REFUNDED"
  | "FAILED"
  | "MANUAL_REVIEW";

export interface HotelActionLogEntry {
  at: string;
  action: string;
  by: string;
  httpStatus?: number;
  request?: unknown;
  response?: unknown;
  note?: string;
}

export interface HotelPrimaryGuestForm {
  firstName: string;
  lastName: string;
  gender: "Male" | "Female" | "Other";
  email: string;
  mobile: string;
  countryCode: string;
  nationality: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  pan?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportNationality?: string;
  passportIssueCountry?: string;
}

export interface HotelRoomGuestForm {
  title: "Mr" | "Ms" | "Mrs" | "Mstr" | "Miss";
  gender: "Male" | "Female" | "Other";
  firstName: string;
  lastName: string;
  type: "ADULT" | "CHILD";
  age?: number;
}

export interface HotelGuestDetailsForm {
  primaryGuest: HotelPrimaryGuestForm;
  roomGuests: HotelRoomGuestForm[][];
  specialRequests?: string;
  gstNumber?: string;
  gstCompanyName?: string;
}

export interface HotelBookingRecord {
  bookingId: string;
  tripjackBookingId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;

  correlationId: string;
  tjHotelId: string | number;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  optionId: string;
  roomName: string;
  mealBasis: string;

  totalFare: number;
  baseFare: number;
  taxesAndFees: number;
  mf: number;
  mft: number;
  discount: number;
  currency: string;

  guestDetails: HotelGuestDetailsForm;
  panRequired: boolean;
  passportRequired: boolean;
  gstType?: string;

  status: HotelBookingStatus;
  paymentStatus: HotelPaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified?: boolean;

  reviewNormalized?: NormalizedHotelReviewResult;
  reviewResponse?: unknown;
  bookRequest?: unknown;
  bookResponse?: unknown;

  supplierReference?: string;
  confirmationNumber?: string;
  voucherUrl?: string;
  voucherNumber?: string;
  tripjackStatus?: string;
  bookAttemptedAt?: string;

  bookingDetailsResponse?: unknown;
  bookingDetailsNormalized?: import("@/lib/tripjack-hotels/parse-booking-details").NormalizedHotelBookingDetails;
  lastStatusCheckedAt?: string;
  cancellationAllowed?: boolean;

  cancellationStatus?: HotelCancellationStatus;
  cancellationResponse?: unknown;
  cancellationRequest?: unknown;
  cancelledAt?: string;
  cancellationRequestedBy?: string;
  cancellationCharge?: number;
  expectedRefundAmount?: number;
  cancellationRemarks?: string;

  refundStatus?: HotelRefundStatus;
  refundAmount?: number;
  refundMode?: string;
  refundReference?: string;
  refundProcessedAt?: string;
  refundNote?: string;

  actionLog?: HotelActionLogEntry[];

  voucherEmailSentAt?: string;
  cancellationEmailSentAt?: string;
  refundEmailSentAt?: string;

  bookingLock?: boolean;
  bookInProgressAt?: string;
  idempotencyKey?: string;
  voucherSentAt?: string;

  adminNotes?: string;
  adminNotesHistory?: Array<{ at: string; by: string; note: string }>;
  manualReviewResolved?: boolean;

  invoiceSentAt?: string;
  emailSentAt?: string;

  guestAccountProvisioned?: boolean;
  guestAccountCreated?: boolean;
  processingEmailSentAt?: string;
  confirmedEmailSentAt?: string;

  createdAt: string;
  updatedAt: string;
}
