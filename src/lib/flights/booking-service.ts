import {
  bookTripJackFlight,
  fetchTripJackBookingDetails,
} from "@/lib/tripjack/client";
import {
  buildTripJackBookRequest,
  type TripJackBookRequest,
} from "@/lib/tripjack/build-book";
import { normalizeTripJackBookingDetails } from "@/lib/tripjack/parse-booking-details";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import {
  createFlightBooking,
  generateFlightBookingId,
  getFlightBookingById,
  updateFlightBooking,
} from "@/lib/flights/firestore";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type {
  FareValidateRequest,
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightReview,
  TripJackTravellerPayload,
} from "@/lib/tripjack/types";

export interface PrepareFlightBookingInput {
  userId: string;
  review: NormalizedFlightReview;
  validated: NormalizedFareValidate;
  passengers: FlightPassengerFormRow[];
  delivery: FlightPassengerDeliveryForm;
  fareValidateRequest: FareValidateRequest;
  fareValidateResponse?: unknown;
  reviewResponse?: unknown;
  searchContext?: { fromCode: string; toCode: string; departureDate: string };
}

export function resolveTripjackBookingId(booking: FlightBookingRecord): string {
  return (
    booking.tripjackBookingId ||
    booking.fareValidateNormalized?.bookingId ||
    booking.reviewNormalized?.bookingId ||
    extractTripJackBookingId(booking.fareValidateResponse) ||
    extractTripJackBookingId(booking.reviewResponse) ||
    ""
  );
}

function resolveValidatedTotalFare(booking: FlightBookingRecord): number {
  const fromValidated = booking.fareValidateNormalized?.totalFare;
  if (typeof fromValidated === "number" && Number.isFinite(fromValidated) && fromValidated > 0) {
    return fromValidated;
  }
  return booking.totalFare;
}

function resolveTravellerInfo(booking: FlightBookingRecord): TripJackTravellerPayload[] | undefined {
  const request = booking.fareValidateRequest as FareValidateRequest | undefined;
  if (request?.travellerInfo?.length) return request.travellerInfo;
  return undefined;
}

function resolveDeliveryInfo(
  booking: FlightBookingRecord
): TripJackBookRequest["deliveryInfo"] | undefined {
  const request = booking.fareValidateRequest as FareValidateRequest | undefined;
  if (request?.deliveryInfo?.emails?.length && request.deliveryInfo.contacts?.length) {
    return {
      emails: request.deliveryInfo.emails,
      contacts: request.deliveryInfo.contacts,
    };
  }
  return undefined;
}

export async function prepareFlightBookingFromSession(
  input: PrepareFlightBookingInput
): Promise<FlightBookingRecord> {
  const tripjackBookingId =
    input.validated.bookingId ||
    input.review.bookingId ||
    extractTripJackBookingId(input.fareValidateResponse) ||
    "";

  const primary = input.passengers[0];
  const now = new Date().toISOString();
  const bookingId = generateFlightBookingId();

  const record: FlightBookingRecord = {
    bookingId,
    tripjackBookingId,
    userId: input.userId,
    customerName: `${primary?.fN ?? ""} ${primary?.lN ?? ""}`.trim() || "Guest",
    customerEmail: input.delivery.email,
    customerMobile: input.delivery.contact,
    tripType: "one_way",
    sourceCode: input.searchContext?.fromCode ?? input.review.departureAirportCode,
    destinationCode: input.searchContext?.toCode ?? input.review.arrivalAirportCode,
    sourceCity: input.review.departureCity,
    destinationCity: input.review.arrivalCity,
    travelDate:
      input.searchContext?.departureDate ??
      input.review.departureDate ??
      input.validated.departureTime,
    airlineName: input.validated.airlineName || input.review.airlineName,
    airlineCode: input.validated.airlineCode || input.review.airlineCode,
    flightNumber: input.validated.flightNumber || input.review.flightNumber,
    departureTime: input.validated.departureTime || input.review.departureTime,
    arrivalTime: input.validated.arrivalTime || input.review.arrivalTime,
    durationFormatted: input.validated.durationFormatted || input.review.durationFormatted,
    passengers: input.passengers,
    delivery: input.delivery,
    totalFare: input.validated.totalFare,
    baseFare: input.validated.baseFare,
    taxesAndFees: input.validated.taxesAndFees,
    priceId: input.validated.priceId || input.review.priceId,
    fareIdentifier: input.validated.fareIdentifier || input.review.fareIdentifier,
    status: tripjackBookingId ? "fare_validated" : "manual_review_required",
    paymentStatus: "pending",
    reviewNormalized: input.review,
    fareValidateNormalized: input.validated,
    fareValidateRequest: input.fareValidateRequest,
    fareValidateResponse: input.fareValidateResponse,
    reviewResponse: input.reviewResponse,
    createdAt: now,
    updatedAt: now,
  };

  return createFlightBooking(record);
}

/**
 * After Razorpay signature verification:
 * payment_success → TripJack Book → Booking Details → Firebase update.
 * Book failure after paid payment → manual_review_required (never lose payment).
 */
export async function confirmFlightAfterPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(input.bookingId);
  if (!booking) throw new Error("Booking not found");

  const paymentFields = {
    paymentStatus: "paid" as const,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignatureVerified: true,
  };

  const tripjackBookingId = resolveTripjackBookingId(booking);
  if (!tripjackBookingId) {
    const failed = await updateFlightBooking(input.bookingId, {
      ...paymentFields,
      status: "manual_review_required",
      tripjackStatus: "missing_booking_id",
      adminNotes: "TripJack bookingId missing after payment. Manual ticket issuance required.",
    });
    if (!failed) throw new Error("Booking update failed");
    return failed;
  }

  const paid = await updateFlightBooking(input.bookingId, {
    ...paymentFields,
    status: "payment_success",
  });
  if (!paid) throw new Error("Failed to save payment success");

  const totalFare = resolveValidatedTotalFare(paid);
  const bookRequest = buildTripJackBookRequest({
    tripjackBookingId,
    totalFare,
    passengers: paid.passengers,
    delivery: paid.delivery,
    travellerInfo: resolveTravellerInfo(paid),
    deliveryInfo: resolveDeliveryInfo(paid),
    gstInfo: {},
  });

  console.log("[flight-booking] TripJack book request:", JSON.stringify(bookRequest));

  await updateFlightBooking(input.bookingId, {
    status: "booking_pending",
    bookRequest,
  });

  let bookResponse: unknown;
  try {
    const bookResult = await bookTripJackFlight(bookRequest);
    bookResponse = bookResult.rawResponse;
    console.log("[flight-booking] TripJack book response:", JSON.stringify(bookResponse));
  } catch (bookError) {
    const message = bookError instanceof Error ? bookError.message : "Book failed";
    console.error("[flight-booking] TripJack book failed:", message);
    const updated = await updateFlightBooking(input.bookingId, {
      ...paymentFields,
      status: "manual_review_required",
      bookRequest,
      bookResponse: bookError instanceof Error ? { message: bookError.message } : undefined,
      tripjackStatus: "book_failed",
      adminNotes: message,
    });
    if (!updated) throw new Error("Booking update failed");
    return updated;
  }

  const confirmedBookingId =
    extractTripJackBookingId(bookResponse) || tripjackBookingId;

  let detailsResponse: unknown;
  let normalizedDetails;
  try {
    console.log("[flight-booking] booking details request:", { bookingId: confirmedBookingId });
    detailsResponse = await fetchTripJackBookingDetails(confirmedBookingId);
    console.log("[flight-booking] booking details response:", JSON.stringify(detailsResponse));
    normalizedDetails = normalizeTripJackBookingDetails(bookResponse, detailsResponse);
    console.log("[flight-booking] normalized booking:", JSON.stringify(normalizedDetails));
  } catch (detailsError) {
    console.warn("[flight-booking] booking details failed:", detailsError);
  }

  const hasTicketMeta = Boolean(
    normalizedDetails?.pnr ||
      normalizedDetails?.airlinePnr ||
      normalizedDetails?.ticketNumber ||
      (normalizedDetails?.flightSegments?.length ?? 0) > 0
  );

  const updated = await updateFlightBooking(input.bookingId, {
    ...paymentFields,
    tripjackBookingId: confirmedBookingId,
    status: hasTicketMeta || normalizedDetails ? "confirmed" : "booking_pending",
    bookRequest,
    bookResponse,
    bookingDetailsResponse: detailsResponse,
    normalizedBookingDetails: normalizedDetails ?? undefined,
    pnr: normalizedDetails?.pnr || undefined,
    airlinePnr: normalizedDetails?.airlinePnr || undefined,
    ticketNumber: normalizedDetails?.ticketNumber || undefined,
    ticketStatus: normalizedDetails?.ticketStatus || undefined,
    orderStatus: normalizedDetails?.orderStatus || undefined,
    tripjackStatus: "booked",
    totalFare:
      normalizedDetails?.fareDetails.totalFare && normalizedDetails.fareDetails.totalFare > 0
        ? normalizedDetails.fareDetails.totalFare
        : totalFare,
  });

  if (!updated) throw new Error("Booking update failed");
  return updated;
}
