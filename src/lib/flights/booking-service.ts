import {
  bookTripJackFlight,
} from "@/lib/tripjack/client";
import { getTripJackProxyConfig } from "@/lib/tripjack/config";
import {
  buildTripJackBookRequest,
  type TripJackBookRequest,
} from "@/lib/tripjack/build-book";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import { logFlightApiCall } from "@/lib/flights/api-logging";
import { captureFlightBookError } from "@/lib/flights/book-error";
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
import type {
  FlightBookingRecord,
  FlightTripjackBookingStatus,
} from "@/lib/flights/types";
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

function resolveBookTotalFare(booking: FlightBookingRecord): number {
  const reviewTf = booking.reviewNormalized?.totalFare;
  if (typeof reviewTf === "number" && Number.isFinite(reviewTf) && reviewTf > 0) {
    return reviewTf;
  }

  const validatedTf = booking.fareValidateNormalized?.totalFare;
  if (typeof validatedTf === "number" && Number.isFinite(validatedTf) && validatedTf > 0) {
    return validatedTf;
  }

  return booking.totalFare;
}

function deriveTripjackBookingStatus(bookResponse: unknown): FlightTripjackBookingStatus {
  if (!bookResponse || typeof bookResponse !== "object") return "UNKNOWN";
  const record = bookResponse as Record<string, unknown>;
  const data = (record.data ?? record) as Record<string, unknown>;
  const status = (data.status ?? record.status) as Record<string, unknown> | string | undefined;

  if (typeof status === "string") {
    const upper = status.toUpperCase();
    if (upper === "SUCCESS" || upper === "COMPLETED") return "SUCCESS";
    if (upper === "PENDING" || upper === "IN_PROGRESS" || upper === "PROCESSING") return "PENDING";
    if (upper === "FAILED" || upper === "ABORTED" || upper === "CANCELLED") return "FAILED";
  }

  if (status && typeof status === "object") {
    if (status.success === true) return "SUCCESS";
    if (status.success === false) return "FAILED";
    const message = String(status.message ?? "").toUpperCase();
    if (message.includes("PENDING")) return "PENDING";
  }

  if (record.success === true || data.success === true) return "SUCCESS";
  if (record.success === false || data.success === false) return "FAILED";
  return "PENDING";
}

function shouldSkipTripJackBook(booking: FlightBookingRecord): boolean {
  if (!booking.tripjackBookAttempted) return false;
  const tjStatus = booking.tripjackBookingStatus;
  return tjStatus === "SUCCESS" || tjStatus === "PENDING";
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
  if (!request?.deliveryInfo?.emails?.length || !request.deliveryInfo.contacts?.length) {
    return undefined;
  }

  const code = request.deliveryInfo.code?.[0]?.replace(/\D/g, "") || "91";
  const contacts = request.deliveryInfo.contacts.map((contact) => {
    const digits = contact.replace(/\D/g, "");
    if (contact.startsWith("+") || digits.length > 10) return contact;
    const local = digits.slice(-10);
    return local ? `+${code}${local}` : contact;
  });

  return {
    emails: request.deliveryInfo.emails,
    contacts,
  };
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
    pipelineStatus: success ? "CONFIRMED" : "BOOKING_DETAILS_POLLING",
    tripjackBookingStatus: success ? "SUCCESS" : input.pollStatus === "FAILED" ? "FAILED" : "PENDING",
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
  paymentFields: PaymentFields,
  options?: { skipBook?: boolean }
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const tripjackBookingId = resolveTripjackBookingId(booking);
  const { bookUrl } = getTripJackProxyConfig();
  const totalFare = resolveBookTotalFare(booking);

  if (!tripjackBookingId) {
    const failed = await updateFlightBooking(bookingId, {
      ...paymentFields,
      status: "payment_received_booking_failed",
      pipelineStatus: "FAILED",
      tripjackStatus: "missing_booking_id",
      bookError: "TripJack bookingId missing after payment",
    });
    if (!failed) throw new Error("Booking update failed");
    await sendFlightBookingFailedAdminAlert(failed, failed.bookError ?? "missing bookingId");
    return failed;
  }

  const bookRequest = buildTripJackBookRequest({
    tripjackBookingId,
    totalFare,
    passengers: booking.passengers,
    delivery: booking.delivery,
    travellerInfo: resolveTravellerInfo(booking),
    deliveryInfo: resolveDeliveryInfo(booking),
    gstInfo: resolveGstInfo(booking),
  });

  let bookResponse: unknown = booking.bookResponse;
  let tripjackBookingStatus = booking.tripjackBookingStatus ?? "UNKNOWN";

  if (!options?.skipBook) {
    await updateFlightBooking(bookingId, {
      status: "booking_pending",
      pipelineStatus: "TRIPJACK_BOOKING_STARTED",
      tripjackBookAttempted: true,
      bookRequest,
      bookAttemptedAt: new Date().toISOString(),
    });

    const bookStarted = Date.now();
    try {
      const bookResult = await bookTripJackFlight(bookRequest);
      bookResponse = bookResult.rawResponse;
      tripjackBookingStatus = deriveTripjackBookingStatus(bookResponse);
      await logFlightApiCall({
        bookingId,
        endpoint: "book",
        method: "POST",
        requestBody: bookRequest,
        responseBody: bookResponse,
        success: tripjackBookingStatus !== "FAILED",
        durationMs: Date.now() - bookStarted,
        userId: booking.userId,
      });

      await updateFlightBooking(bookingId, {
        bookResponse,
        tripjackBookingId: bookResult.bookingId || tripjackBookingId,
        tripjackBookingStatus,
      });
    } catch (bookError) {
      const errorDetail = captureFlightBookError(bookError, bookRequest, bookUrl);
      await logFlightApiCall({
        bookingId,
        endpoint: "book",
        method: "POST",
        requestBody: bookRequest,
        success: false,
        errorMessage: errorDetail.message,
        durationMs: Date.now() - bookStarted,
        userId: booking.userId,
      });

      const updated = await updateFlightBooking(bookingId, {
        ...paymentFields,
        status: "payment_received_booking_failed",
        pipelineStatus: "TRIPJACK_BOOKING_FAILED",
        tripjackBookAttempted: true,
        tripjackBookingStatus: "FAILED",
        bookRequest,
        bookResponse: errorDetail.response ?? { message: errorDetail.message },
        bookError: errorDetail.message,
        bookErrorDetail: errorDetail,
        tripjackStatus: "book_failed",
      });
      if (!updated) throw new Error("Booking update failed");
      await sendFlightBookingFailedAdminAlert(updated, errorDetail.message);
      return updated;
    }
  }

  const confirmedBookingId =
    extractTripJackBookingId(bookResponse) || booking.tripjackBookingId || tripjackBookingId;

  await updateFlightBooking(bookingId, {
    pipelineStatus: "BOOKING_DETAILS_POLLING",
  });

  let pollResult;
  try {
    pollResult = await pollTripJackFlightBookingDetails({
      tripjackBookingId: confirmedBookingId,
      bookResponse,
      onAttempt: async (attempt, orderStatus) => {
        await updateFlightBooking(bookingId, {
          bookingDetailsPollAttempts: attempt,
          bookingDetailsPollStatus: orderStatus,
          orderStatus,
          pipelineStatus: "BOOKING_DETAILS_POLLING",
        });
        await logFlightApiCall({
          bookingId,
          endpoint: "booking-details/poll",
          method: "POST",
          requestBody: { bookingId: confirmedBookingId, requirePaxPricing: true, attempt },
          responseBody: { orderStatus },
          success: isBookingDetailsSuccess(orderStatus),
          userId: booking.userId,
        });
      },
    });
  } catch (pollError) {
    const message = pollError instanceof Error ? pollError.message : "Booking details poll failed";
    await logFlightApiCall({
      bookingId,
      endpoint: "booking-details",
      method: "POST",
      requestBody: { bookingId: confirmedBookingId, requirePaxPricing: true },
      success: false,
      errorMessage: message,
      userId: booking.userId,
    });

    const pending = await updateFlightBooking(bookingId, {
      ...paymentFields,
      status: "booking_pending",
      pipelineStatus: "BOOKING_DETAILS_POLLING",
      tripjackBookAttempted: true,
      tripjackBookingStatus: tripjackBookingStatus === "FAILED" ? "FAILED" : "PENDING",
      bookRequest,
      bookResponse,
      bookError: message,
      tripjackStatus: "details_pending",
    });
    if (!pending) throw new Error("Booking update failed");
    return pending;
  }

  await logFlightApiCall({
    bookingId,
    endpoint: "booking-details",
    method: "POST",
    requestBody: { bookingId: confirmedBookingId, requirePaxPricing: true },
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
    shouldSkipTripJackBook(booking)
  ) {
    if (booking.status === "confirmed") return booking;
    return executeTripJackFlightBook(input.bookingId, paymentFields, { skipBook: true });
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
      if (latest && shouldSkipTripJackBook(latest)) return latest;
      throw new Error("Booking confirmation is already in progress");
    }
  }

  if (booking.bookAttemptedAt && booking.bookResponse && booking.status === "confirmed") {
    return booking;
  }

  await updateFlightBooking(input.bookingId, {
    ...paymentFields,
    status: "payment_success",
    pipelineStatus: "PAYMENT_SUCCESS",
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
        totalFare: resolveBookTotalFare(booking),
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
