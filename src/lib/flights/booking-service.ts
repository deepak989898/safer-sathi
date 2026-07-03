import {
  bookTripJackFlight,
  confirmTripJackFareBeforeTicket,
  fetchTripJackBookingDetails,
} from "@/lib/tripjack/client";
import { buildTripJackBookRequest } from "@/lib/tripjack/build-book";
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

export async function confirmFlightAfterPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(input.bookingId);
  if (!booking) throw new Error("Booking not found");

  const tripjackBookingId = resolveTripjackBookingId(booking);
  if (!tripjackBookingId) {
    const failed = await updateFlightBooking(input.bookingId, {
      status: "manual_review_required",
      paymentStatus: "paid",
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignatureVerified: true,
    });
    if (!failed) throw new Error("Booking update failed");
    return failed;
  }

  await updateFlightBooking(input.bookingId, {
    status: "payment_success",
    paymentStatus: "paid",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignatureVerified: true,
  });

  try {
    await confirmTripJackFareBeforeTicket(tripjackBookingId);
  } catch (confirmFareError) {
    console.warn("[flight-booking] confirm fare before ticket skipped:", confirmFareError);
  }

  const bookRequest = buildTripJackBookRequest({
    tripjackBookingId,
    totalFare: booking.totalFare,
    passengers: booking.passengers,
    delivery: booking.delivery,
  });

  console.log("[flight-booking] TripJack book request:", JSON.stringify(bookRequest));

  let bookResponse: unknown;
  try {
    const bookResult = await bookTripJackFlight(bookRequest);
    bookResponse = bookResult.rawResponse;
    console.log("[flight-booking] TripJack book response:", JSON.stringify(bookResponse));
  } catch (bookError) {
    const message = bookError instanceof Error ? bookError.message : "Book failed";
    const updated = await updateFlightBooking(input.bookingId, {
      status: "manual_review_required",
      bookRequest,
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

  const updated = await updateFlightBooking(input.bookingId, {
    tripjackBookingId: confirmedBookingId,
    status: normalizedDetails ? "confirmed" : "booking_pending",
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
    totalFare: normalizedDetails?.fareDetails.totalFare || booking.totalFare,
  });

  if (!updated) throw new Error("Booking update failed");
  return updated;
}
