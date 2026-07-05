import {
  cancelTripJackHotelBooking,
  fetchTripJackHotelBookingDetails,
} from "@/lib/tripjack-hotels/client";
import {
  normalizeHotelBookingDetails,
  normalizeHotelCancelResponse,
} from "@/lib/tripjack-hotels/parse-booking-details";
import { estimateHotelCancellationCharge } from "@/lib/hotels/cancellation-estimate";
import { canCancelHotelBooking } from "@/lib/hotels/booking-guards";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import {
  sendHotelCancellationConfirmedNotification,
  sendHotelCancellationRequestedNotification,
  sendHotelVoucherReadyNotification,
} from "@/lib/hotels/notifications";
import type { HotelActionLogEntry, HotelBookingRecord } from "@/lib/hotels/types";

export { canCancelHotelBooking, estimateHotelCancellationCharge };

function appendLog(
  booking: HotelBookingRecord,
  entry: Omit<HotelActionLogEntry, "at">
): HotelActionLogEntry[] {
  const log = [...(booking.actionLog ?? [])];
  log.push({ ...entry, at: new Date().toISOString() });
  return log.slice(-50);
}

export async function refreshHotelBookingDetails(
  bookingId: string,
  actionBy = "system"
): Promise<HotelBookingRecord> {
  const booking = await getHotelBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.tripjackBookingId) throw new Error("TripJack booking ID missing");

  const request = { bookingId: booking.tripjackBookingId };
  let response: unknown;
  let httpStatus: number | undefined;

  try {
    const result = await fetchTripJackHotelBookingDetails(booking.tripjackBookingId);
    response = result.rawResponse;
    httpStatus = result.httpStatus;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking details failed";
    const updated = await updateHotelBooking(bookingId, {
      lastStatusCheckedAt: new Date().toISOString(),
      actionLog: appendLog(booking, {
        action: "refresh_booking_details",
        by: actionBy,
        note: message,
        request,
      }),
    });
    if (!updated) throw new Error("Failed to save booking");
    throw new Error(message);
  }

  const normalized = normalizeHotelBookingDetails(response);
  if (!normalized) throw new Error("Could not parse booking details");

  const hadVoucher = Boolean(booking.voucherUrl || booking.voucherNumber);
  const hasVoucherNow = Boolean(
    normalized.voucherUrl || normalized.voucherNumber || normalized.confirmationNumber
  );

  let status = booking.status;
  if (
    (normalized.orderStatus === "SUCCESS" ||
      normalized.orderStatus === "COMPLETED" ||
      normalized.bookingStatus === "CONFIRMED") &&
    !["cancelled", "refund_pending", "refunded", "cancellation_requested"].includes(
      booking.status
    )
  ) {
    status = "confirmed";
  }

  const updated = await updateHotelBooking(bookingId, {
    bookingDetailsResponse: response,
    bookingDetailsNormalized: normalized,
    lastStatusCheckedAt: new Date().toISOString(),
    supplierReference: normalized.supplierReference || booking.supplierReference,
    confirmationNumber: normalized.confirmationNumber || booking.confirmationNumber,
    voucherUrl: normalized.voucherUrl || booking.voucherUrl,
    voucherNumber: normalized.voucherNumber || booking.voucherNumber,
    tripjackStatus: normalized.bookingStatus || normalized.orderStatus,
    cancellationAllowed: normalized.cancellationAllowed,
    status,
    actionLog: appendLog(booking, {
      action: "refresh_booking_details",
      by: actionBy,
      httpStatus,
      request,
      response,
    }),
  });

  if (!updated) throw new Error("Failed to save booking details");

  if (!hadVoucher && hasVoucherNow && updated.status === "confirmed") {
    try {
      await sendHotelVoucherReadyNotification(updated);
      await updateHotelBooking(bookingId, {
        voucherEmailSentAt: new Date().toISOString(),
      });
    } catch (emailError) {
      console.warn("[hotel-post-booking] voucher email failed:", emailError);
    }
  }

  return updated;
}

export async function submitHotelCancellation(
  bookingId: string,
  input: { remarks?: string; requestedBy: string }
): Promise<HotelBookingRecord> {
  const booking = await getHotelBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!canCancelHotelBooking(booking)) {
    throw new Error("This booking cannot be cancelled");
  }
  if (
    booking.cancellationStatus === "REQUESTED" ||
    booking.cancellationStatus === "CANCELLED"
  ) {
    throw new Error("Cancellation already submitted for this booking");
  }
  if (!booking.tripjackBookingId) throw new Error("TripJack booking ID missing");

  const estimate = estimateHotelCancellationCharge(booking);
  const request = {
    bookingId: booking.tripjackBookingId,
    remarks: input.remarks ?? "Customer requested cancellation",
  };

  let response: unknown;
  let httpStatus: number | undefined;
  let normalized = null;

  try {
    const result = await cancelTripJackHotelBooking(request);
    response = result.rawResponse;
    httpStatus = result.httpStatus;
    normalized = normalizeHotelCancelResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed";
    await updateHotelBooking(bookingId, {
      cancellationStatus: "FAILED",
      actionLog: appendLog(booking, {
        action: "cancel_booking",
        by: input.requestedBy,
        note: message,
        request,
      }),
    });
    throw new Error(message);
  }

  const charge =
    normalized?.cancellationCharge && normalized.cancellationCharge > 0
      ? normalized.cancellationCharge
      : estimate.cancellationCharge;
  const expectedRefund =
    normalized?.refundAmount && normalized.refundAmount > 0
      ? normalized.refundAmount
      : estimate.expectedRefund;

  const cancelSuccess =
    normalized?.success !== false &&
    (normalized?.cancellationStatus?.toUpperCase().includes("CANCEL") ?? true);

  const updates: Partial<HotelBookingRecord> = {
    cancellationRequest: request,
    cancellationResponse: response,
    cancellationStatus: cancelSuccess ? "CANCELLED" : "REQUESTED",
    cancellationRemarks: input.remarks,
    cancellationRequestedBy: input.requestedBy,
    cancellationCharge: charge,
    expectedRefundAmount: expectedRefund,
    refundStatus: expectedRefund > 0 ? "PENDING" : "NONE",
    refundAmount: expectedRefund,
    cancelledAt: new Date().toISOString(),
    status: cancelSuccess ? "cancelled" : "cancellation_requested",
    actionLog: appendLog(booking, {
      action: "cancel_booking",
      by: input.requestedBy,
      httpStatus,
      request,
      response,
    }),
  };

  if (expectedRefund > 0) {
    updates.status = cancelSuccess ? "refund_pending" : "cancellation_requested";
    updates.refundStatus = "PENDING";
  }

  const updated = await updateHotelBooking(bookingId, updates);
  if (!updated) throw new Error("Failed to save cancellation");

  try {
    if (cancelSuccess) {
      await sendHotelCancellationConfirmedNotification(updated);
    } else {
      await sendHotelCancellationRequestedNotification(updated);
    }
    await updateHotelBooking(bookingId, {
      cancellationEmailSentAt: new Date().toISOString(),
    });
  } catch (emailError) {
    console.warn("[hotel-post-booking] cancellation email failed:", emailError);
  }

  return updated;
}
