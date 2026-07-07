import { sendAdminBookingAlert, sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import {
  createHotelBooking,
  generateHotelBookingId,
  getHotelBookingById,
  updateHotelBooking,
} from "@/lib/hotels/firestore";
import { ensureHotelGuestCustomerAccess } from "@/lib/hotels/hotel-guest-access";
import { sendHotelBookingProcessingNotification } from "@/lib/hotels/notifications";
import { pollHotelBookingDetailsAfterBook } from "@/lib/hotels/booking-details-poll";
import { processHotelBookingFailure } from "@/lib/hotels/failed-booking-service";
import { refreshHotelBookingDetails } from "@/lib/hotels/post-booking-service";
import { normalizeGuestDetailsForm } from "@/lib/hotels/guest-validation";
import type { HotelBookingRecord, HotelGuestDetailsForm } from "@/lib/hotels/types";
import { buildTripJackHotelBookRequest } from "@/lib/tripjack-hotels/build-book";
import { bookTripJackHotel } from "@/lib/tripjack-hotels/client";
import { normalizeHotelBookResponse } from "@/lib/tripjack-hotels/parse-book-response";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { Booking } from "@/types";

export interface PrepareHotelBookingInput {
  userId: string;
  review: NormalizedHotelReviewResult;
  guestDetails: HotelGuestDetailsForm;
  reviewHash?: string;
}

export async function prepareHotelBookingFromReview(
  input: PrepareHotelBookingInput
): Promise<HotelBookingRecord> {
  const option = input.review.option;
  const pricing = option.pricing;
  const now = new Date().toISOString();
  const guestDetails = normalizeGuestDetailsForm(input.guestDetails, {
    panRequired: option.panRequired,
    passportRequired: option.passportRequired,
  });
  const pg = guestDetails.primaryGuest;

  const record: HotelBookingRecord = {
    bookingId: generateHotelBookingId(),
    tripjackBookingId: input.review.bookingId,
    userId: input.userId,
    customerName: `${pg.firstName} ${pg.lastName}`.trim(),
    customerEmail: pg.email,
    customerMobile: pg.mobile,
    correlationId: input.review.correlationId,
    reviewHash: input.reviewHash?.trim() || input.review.reviewHash || undefined,
    tjHotelId: input.review.tjHotelId,
    hotelName: input.review.hotelName,
    checkIn: input.review.searchContext.checkIn,
    checkOut: input.review.searchContext.checkOut,
    rooms: input.review.searchContext.rooms,
    optionId: option.optionId,
    roomName: option.roomInfo[0] || option.roomName,
    mealBasis: option.mealBasisLabel || option.mealBasis,
    totalFare: pricing.totalPrice,
    baseFare: pricing.basePrice,
    taxesAndFees: pricing.taxes,
    mf: pricing.mf,
    mft: pricing.mft,
    discount: pricing.discount,
    currency: pricing.currency,
    guestDetails,
    panRequired: option.panRequired,
    passportRequired: option.passportRequired,
    gstType: option.gstType,
    status: input.review.bookingId ? "review_confirmed" : "manual_review_required",
    paymentStatus: "pending",
    reviewNormalized: input.review,
    createdAt: now,
    updatedAt: now,
  };

  return createHotelBooking(record);
}

export function hotelBookingToLegacyBooking(hotel: HotelBookingRecord): Booking {
  const now = new Date().toISOString();
  return {
    id: hotel.bookingId,
    bookingNumber: hotel.confirmationNumber ?? hotel.bookingId.slice(-8).toUpperCase(),
    userId: hotel.userId,
    customerName: hotel.customerName,
    customerEmail: hotel.customerEmail,
    customerPhone: hotel.customerMobile,
    serviceType: "hotel",
    serviceId: String(hotel.tjHotelId),
    serviceName: {
      en: hotel.hotelName,
      hi: hotel.hotelName,
    },
    startDate: hotel.checkIn,
    endDate: hotel.checkOut,
    guests: hotel.rooms.reduce((sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0), 0),
    amount: hotel.totalFare,
    paidAmount: hotel.paymentStatus === "paid" ? hotel.totalFare : 0,
    departure: hotel.hotelName,
    destination: hotel.hotelName,
    status: hotel.status === "confirmed" ? "confirmed" : "pending",
    paymentStatus: hotel.paymentStatus === "paid" ? "paid" : "pending",
    aiProcessed: false,
    notes: `TripJack: ${hotel.tripjackBookingId} | Room: ${hotel.roomName} | Ref: ${hotel.confirmationNumber ?? "pending"}`,
    createdAt: hotel.createdAt,
    updatedAt: now,
  };
}

export async function confirmHotelAfterPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<HotelBookingRecord> {
  const booking = await getHotelBookingById(input.bookingId);
  if (!booking) throw new Error("Booking not found");

  const idempotencyKey = `${booking.userId}_${booking.bookingId}_${input.razorpayPaymentId}`;

  if (
    booking.idempotencyKey === idempotencyKey &&
    booking.razorpayPaymentId === input.razorpayPaymentId &&
    (booking.status === "confirmed" || booking.status === "booking_pending") &&
    booking.bookResponse
  ) {
    return booking;
  }

  if (booking.bookingLock && booking.bookInProgressAt) {
    const lockAge = Date.now() - new Date(booking.bookInProgressAt).getTime();
    if (lockAge < 120_000) {
      const latest = await getHotelBookingById(input.bookingId);
      if (latest?.status === "confirmed") return latest;
      throw new Error("Booking confirmation is already in progress");
    }
  }

  const paymentFields = {
    paymentStatus: "paid" as const,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignatureVerified: true,
    idempotencyKey,
  };

  if (!booking.tripjackBookingId) {
    const failed = await updateHotelBooking(input.bookingId, {
      ...paymentFields,
      status: "manual_review_required",
      tripjackStatus: "missing_booking_id",
      adminNotes: "TripJack bookingId missing after payment.",
    });
    if (!failed) throw new Error("Booking update failed");
    return failed;
  }

  if (booking.bookAttemptedAt && booking.bookResponse) {
    const existing = await getHotelBookingById(input.bookingId);
    if (existing?.status === "confirmed" || existing?.status === "booking_pending") {
      return existing;
    }
  }

  await updateHotelBooking(input.bookingId, {
    ...paymentFields,
    status: "payment_success",
    bookingLock: true,
    bookInProgressAt: new Date().toISOString(),
  });

  try {
    return await executeTripJackHotelBook(input.bookingId, paymentFields);
  } finally {
    await updateHotelBooking(input.bookingId, { bookingLock: false });
  }
}

async function executeTripJackHotelBook(
  bookingId: string,
  paymentFields: {
    paymentStatus: "paid";
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignatureVerified: boolean;
    idempotencyKey: string;
  }
): Promise<HotelBookingRecord> {
  const booking = await getHotelBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const bookRequest = buildTripJackHotelBookRequest({
    tripjackBookingId: booking.tripjackBookingId,
    totalFare: booking.totalFare,
    guestDetails: booking.guestDetails,
    rooms: booking.rooms,
  });

  await updateHotelBooking(bookingId, {
    status: "booking_pending",
    bookRequest,
    bookAttemptedAt: new Date().toISOString(),
  });

  let bookResponse: unknown;
  try {
    const result = await bookTripJackHotel(bookRequest);
    bookResponse = result.rawResponse;
  } catch (bookError) {
    const message = bookError instanceof Error ? bookError.message : "Book failed";
    const updated = await updateHotelBooking(bookingId, {
      ...paymentFields,
      status: "booking_pending",
      bookRequest,
      bookResponse: bookError instanceof Error ? { message: bookError.message } : undefined,
      tripjackStatus: "book_failed",
      adminNotes: message,
    });
    if (!updated) throw new Error("Booking update failed");
    try {
      await sendAdminBookingAlert({
        booking: hotelBookingToLegacyBooking(updated),
        isFullyPaid: true,
        balanceDue: 0,
      });
    } catch {
      /* non-blocking */
    }
    return updated;
  }

  const normalized = normalizeHotelBookResponse(bookResponse);
  const orderStatus = (normalized?.orderStatus ?? "").toUpperCase();
  const bookRejected =
    normalized?.statusSuccess === false &&
    ["FAILED", "REJECTED", "BOOKING_FAILED", "DECLINED"].includes(orderStatus);

  if (bookRejected) {
    const failed = await updateHotelBooking(bookingId, {
      ...paymentFields,
      bookRequest,
      bookResponse,
      tripjackStatus: orderStatus || "FAILED",
      adminNotes: "TripJack rejected the hotel booking after payment.",
    });
    if (!failed) throw new Error("Booking update failed");
    return processHotelBookingFailure(failed);
  }

  const confirmed =
    normalized?.statusSuccess !== false &&
    Boolean(normalized?.bookingId || booking.tripjackBookingId);

  const updated = await updateHotelBooking(bookingId, {
    ...paymentFields,
    status: confirmed ? "confirmed" : "booking_pending",
    bookRequest,
    bookResponse,
    tripjackBookingId: normalized?.bookingId || booking.tripjackBookingId,
    supplierReference: normalized?.supplierReference,
    confirmationNumber: normalized?.confirmationNumber,
    voucherUrl: normalized?.voucherUrl,
    tripjackStatus: confirmed ? "booked" : "book_pending",
  });

  if (!updated) throw new Error("Booking update failed");

  if (updated.status === "confirmed") {
    const { booking: withGuest, loginCredentials } =
      await ensureHotelGuestCustomerAccess(updated);
    try {
      await sendBookingConfirmationNotifications({
        booking: hotelBookingToLegacyBooking(withGuest),
        isFullyPaid: true,
        loginEmail: loginCredentials?.loginEmail,
        loginPassword: loginCredentials?.loginPassword,
      });
      await updateHotelBooking(bookingId, {
        emailSentAt: new Date().toISOString(),
        confirmedEmailSentAt: new Date().toISOString(),
        invoiceSentAt: new Date().toISOString(),
      });
    } catch (emailError) {
      console.warn("[hotel-booking] confirmation email failed:", emailError);
    }
    try {
      await refreshHotelBookingDetails(bookingId, "system");
    } catch (refreshError) {
      console.warn("[hotel-booking] post-book refresh failed:", refreshError);
    }
    return (await getHotelBookingById(bookingId)) ?? withGuest;
  }

  const { booking: withGuest } = await ensureHotelGuestCustomerAccess(updated);
  if (withGuest.status === "booking_pending" && !withGuest.processingEmailSentAt) {
    try {
      const { loginCredentials } = await ensureHotelGuestCustomerAccess(withGuest);
      await sendHotelBookingProcessingNotification(withGuest, loginCredentials);
      await updateHotelBooking(bookingId, {
        processingEmailSentAt: new Date().toISOString(),
      });
    } catch (emailError) {
      console.warn("[hotel-booking] processing email failed:", emailError);
    }
  }

  if (withGuest.status === "booking_pending" || withGuest.status === "payment_success") {
    void pollHotelBookingDetailsAfterBook(bookingId).catch((pollError) => {
      console.warn("[hotel-booking] post-book poll failed:", pollError);
    });
  }

  return (await getHotelBookingById(bookingId)) ?? withGuest;
}

/** Admin retry: re-call TripJack Book when payment already verified. */
export async function retryTripJackHotelBook(bookingId: string): Promise<HotelBookingRecord> {
  const booking = await getHotelBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.paymentStatus !== "paid") throw new Error("Payment not verified");
  if (booking.status === "confirmed" && booking.bookResponse) return booking;
  if (!booking.razorpayPaymentId || !booking.razorpayOrderId) {
    throw new Error("Razorpay payment reference missing");
  }

  if (booking.bookingLock) throw new Error("Booking lock active — try again shortly");

  await updateHotelBooking(bookingId, {
    bookingLock: true,
    bookInProgressAt: new Date().toISOString(),
  });

  try {
    return await executeTripJackHotelBook(bookingId, {
      paymentStatus: "paid",
      razorpayOrderId: booking.razorpayOrderId,
      razorpayPaymentId: booking.razorpayPaymentId,
      razorpaySignatureVerified: true,
      idempotencyKey:
        booking.idempotencyKey ??
        `${booking.userId}_${booking.bookingId}_${booking.razorpayPaymentId}`,
    });
  } finally {
    await updateHotelBooking(bookingId, { bookingLock: false });
  }
}
