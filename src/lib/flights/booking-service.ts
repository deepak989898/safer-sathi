import {
  bookTripJackFlight,
} from "@/lib/tripjack/client";
import {
  buildTripJackBookRequest,
  type TripJackBookRequest,
} from "@/lib/tripjack/build-book";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import { logFlightApiCall } from "@/lib/flights/api-logging";
import {
  hasFlightTicketMetadata,
  isBookingDetailsSuccess,
  pollTripJackFlightBookingDetails,
} from "@/lib/flights/booking-details-poll";
import {
  createFlightBooking,
  generateFlightBookingId,
  getFlightBookingById,
  updateFlightBooking,
} from "@/lib/flights/firestore";
import {
  sendFlightBookingFailedAdminAlert,
  sendFlightConfirmationNotifications,
} from "@/lib/flights/notifications";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type {
  FareValidateRequest,
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightBookingDetails,
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

function resolveGstInfo(booking: FlightBookingRecord): Record<string, unknown> {
  const request = booking.fareValidateRequest as FareValidateRequest & {
    gstInfo?: Record<string, unknown>;
  };
  return request?.gstInfo ?? {};
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

type PaymentFields = {
  paymentStatus: "paid";
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignatureVerified: boolean;
  idempotencyKey: string;
};

async function applyBookingDetailsToRecord(
  bookingId: string,
  paymentFields: PaymentFields,
  input: {
    tripjackBookingId: string;
    bookRequest: TripJackBookRequest;
    bookResponse: unknown;
    detailsResponse: unknown;
    normalized: NormalizedFlightBookingDetails | null;
    pollAttempts: number;
    pollStatus: string;
    totalFare: number;
  }
): Promise<FlightBookingRecord | null> {
  const normalized = input.normalized;
  const success =
    isBookingDetailsSuccess(input.pollStatus) && hasFlightTicketMetadata(normalized);

  return updateFlightBooking(bookingId, {
    ...paymentFields,
    tripjackBookingId: input.tripjackBookingId,
    status: success ? "confirmed" : "booking_pending",
    bookRequest: input.bookRequest,
    bookResponse: input.bookResponse,
    bookingDetailsResponse: input.detailsResponse,
    bookingDetailResponse: input.detailsResponse,
    normalizedBookingDetails: normalized ?? undefined,
    bookingDetailNormalized: normalized ?? undefined,
    pnr: normalized?.pnr || undefined,
    airlinePnr: normalized?.airlinePnr || undefined,
    ticketNumber: normalized?.ticketNumber || undefined,
    ticketStatus: normalized?.ticketStatus || undefined,
    orderStatus: normalized?.orderStatus || input.pollStatus,
    tripjackStatus: success ? "booked" : "details_pending",
    bookingDetailsPollAttempts: input.pollAttempts,
    bookingDetailsPollStatus: input.pollStatus,
    totalFare:
      normalized?.fareDetails.totalFare && normalized.fareDetails.totalFare > 0
        ? normalized.fareDetails.totalFare
        : input.totalFare,
  });
}

async function executeTripJackFlightBook(
  bookingId: string,
  paymentFields: PaymentFields
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const tripjackBookingId = resolveTripjackBookingId(booking);
  if (!tripjackBookingId) {
    const failed = await updateFlightBooking(bookingId, {
      ...paymentFields,
      status: "payment_received_booking_failed",
      tripjackStatus: "missing_booking_id",
      bookError: "TripJack bookingId missing after payment",
    });
    if (!failed) throw new Error("Booking update failed");
    await sendFlightBookingFailedAdminAlert(failed, failed.bookError ?? "missing bookingId");
    return failed;
  }

  const totalFare = resolveValidatedTotalFare(booking);
  const bookRequest = buildTripJackBookRequest({
    tripjackBookingId,
    totalFare,
    passengers: booking.passengers,
    delivery: booking.delivery,
    travellerInfo: resolveTravellerInfo(booking),
    deliveryInfo: resolveDeliveryInfo(booking),
    gstInfo: resolveGstInfo(booking),
  });

  await updateFlightBooking(bookingId, {
    status: "booking_pending",
    bookRequest,
    bookAttemptedAt: new Date().toISOString(),
  });

  const bookStarted = Date.now();
  let bookResponse: unknown;

  try {
    const bookResult = await bookTripJackFlight(bookRequest);
    bookResponse = bookResult.rawResponse;
    await logFlightApiCall({
      bookingId,
      endpoint: "book",
      method: "POST",
      requestBody: bookRequest,
      responseBody: bookResponse,
      success: true,
      durationMs: Date.now() - bookStarted,
      userId: booking.userId,
    });
  } catch (bookError) {
    const message = bookError instanceof Error ? bookError.message : "Book failed";
    await logFlightApiCall({
      bookingId,
      endpoint: "book",
      method: "POST",
      requestBody: bookRequest,
      success: false,
      errorMessage: message,
      durationMs: Date.now() - bookStarted,
      userId: booking.userId,
    });

    const updated = await updateFlightBooking(bookingId, {
      ...paymentFields,
      status: "payment_received_booking_failed",
      bookRequest,
      bookResponse: bookError instanceof Error ? { message: bookError.message } : undefined,
      tripjackStatus: "book_failed",
      bookError: message,
    });
    if (!updated) throw new Error("Booking update failed");
    await sendFlightBookingFailedAdminAlert(updated, message);
    return updated;
  }

  const confirmedBookingId = extractTripJackBookingId(bookResponse) || tripjackBookingId;

  const pollResult = await pollTripJackFlightBookingDetails({
    tripjackBookingId: confirmedBookingId,
    bookResponse,
    onAttempt: async (attempt, orderStatus) => {
      await updateFlightBooking(bookingId, {
        bookingDetailsPollAttempts: attempt,
        bookingDetailsPollStatus: orderStatus,
        orderStatus,
      });
      await logFlightApiCall({
        bookingId,
        endpoint: "booking-details/poll",
        method: "POST",
        requestBody: { bookingId: confirmedBookingId, attempt },
        responseBody: { orderStatus },
        success: isBookingDetailsSuccess(orderStatus),
        userId: booking.userId,
      });
    },
  });

  await logFlightApiCall({
    bookingId,
    endpoint: "booking-details",
    method: "POST",
    requestBody: { bookingId: confirmedBookingId },
    responseBody: pollResult.normalized,
    success: hasFlightTicketMetadata(pollResult.normalized),
    durationMs: pollResult.attempts * 5000,
    userId: booking.userId,
  });

  const updated = await applyBookingDetailsToRecord(bookingId, paymentFields, {
    tripjackBookingId: confirmedBookingId,
    bookRequest,
    bookResponse,
    detailsResponse: pollResult.detailsResponse,
    normalized: pollResult.normalized,
    pollAttempts: pollResult.attempts,
    pollStatus: pollResult.finalStatus,
    totalFare,
  });

  if (!updated) throw new Error("Booking update failed");

  if (updated.status === "confirmed") {
    try {
      await sendFlightConfirmationNotifications(updated);
    } catch (emailError) {
      console.warn("[flight-booking] confirmation notifications failed:", emailError);
    }
  }

  return (await getFlightBookingById(bookingId)) ?? updated;
}

/**
 * After Razorpay signature verification:
 * payment_success → TripJack Book (OMS) → poll Booking Details → confirm + notify.
 */
export async function confirmFlightAfterPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(input.bookingId);
  if (!booking) throw new Error("Booking not found");

  const idempotencyKey = `${booking.userId}_${booking.bookingId}_${input.razorpayPaymentId}`;

  const paymentFields: PaymentFields = {
    paymentStatus: "paid",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignatureVerified: true,
    idempotencyKey,
  };

  if (
    booking.idempotencyKey === idempotencyKey &&
    booking.razorpayPaymentId === input.razorpayPaymentId &&
    booking.status === "confirmed"
  ) {
    return booking;
  }

  if (
    booking.idempotencyKey === idempotencyKey &&
    booking.razorpayPaymentId === input.razorpayPaymentId &&
    booking.status === "payment_received_booking_failed"
  ) {
    await updateFlightBooking(input.bookingId, {
      bookingLock: true,
      bookInProgressAt: new Date().toISOString(),
    });
    try {
      return await executeTripJackFlightBook(input.bookingId, paymentFields);
    } finally {
      await updateFlightBooking(input.bookingId, { bookingLock: false });
    }
  }

  if (booking.bookingLock && booking.bookInProgressAt) {
    const lockAge = Date.now() - new Date(booking.bookInProgressAt).getTime();
    if (lockAge < 120_000) {
      const latest = await getFlightBookingById(input.bookingId);
      if (latest?.status === "confirmed") return latest;
      throw new Error("Booking confirmation is already in progress");
    }
  }

  if (booking.bookAttemptedAt && booking.bookResponse && booking.status === "confirmed") {
    return booking;
  }

  await updateFlightBooking(input.bookingId, {
    ...paymentFields,
    status: "payment_success",
    bookingLock: true,
    bookInProgressAt: new Date().toISOString(),
  });

  try {
    return await executeTripJackFlightBook(input.bookingId, paymentFields);
  } finally {
    await updateFlightBooking(input.bookingId, { bookingLock: false });
  }
}

/** Admin one-click retry when payment verified but TripJack book failed. */
export async function retryTripJackFlightBook(bookingId: string): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.paymentStatus !== "paid") throw new Error("Payment not verified");
  if (booking.status === "confirmed" && booking.pnr) return booking;
  if (!booking.razorpayPaymentId || !booking.razorpayOrderId) {
    throw new Error("Razorpay payment reference missing");
  }
  if (booking.bookingLock) throw new Error("Booking lock active — try again shortly");

  const paymentFields: PaymentFields = {
    paymentStatus: "paid",
    razorpayOrderId: booking.razorpayOrderId,
    razorpayPaymentId: booking.razorpayPaymentId,
    razorpaySignatureVerified: Boolean(booking.razorpaySignatureVerified),
    idempotencyKey:
      booking.idempotencyKey ??
      `${booking.userId}_${booking.bookingId}_${booking.razorpayPaymentId}`,
  };

  await updateFlightBooking(bookingId, {
    bookingLock: true,
    bookInProgressAt: new Date().toISOString(),
  });

  try {
    if (booking.bookResponse && booking.tripjackBookingId && booking.status === "booking_pending") {
      const pollResult = await pollTripJackFlightBookingDetails({
        tripjackBookingId: booking.tripjackBookingId,
        bookResponse: booking.bookResponse,
      });
      const updated = await applyBookingDetailsToRecord(bookingId, paymentFields, {
        tripjackBookingId: booking.tripjackBookingId,
        bookRequest: booking.bookRequest as TripJackBookRequest,
        bookResponse: booking.bookResponse,
        detailsResponse: pollResult.detailsResponse,
        normalized: pollResult.normalized,
        pollAttempts: pollResult.attempts,
        pollStatus: pollResult.finalStatus,
        totalFare: resolveValidatedTotalFare(booking),
      });
      if (!updated) throw new Error("Booking update failed");
      if (updated.status === "confirmed") {
        try {
          await sendFlightConfirmationNotifications(updated);
        } catch {
          /* non-blocking */
        }
      }
      return (await getFlightBookingById(bookingId)) ?? updated;
    }

    return await executeTripJackFlightBook(bookingId, paymentFields);
  } finally {
    await updateFlightBooking(bookingId, { bookingLock: false });
  }
}
