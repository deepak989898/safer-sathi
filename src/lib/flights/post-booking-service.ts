import {
  fetchTripJackBookingDetails,
  fetchTripJackCancellationCharges,
  pollTripJackAmendment,
  releaseTripJackPnr,
  submitTripJackAmendment,
} from "@/lib/tripjack/client";
import {
  normalizeCancellationCharges,
  normalizePollAmendment,
  normalizeSubmitAmendment,
} from "@/lib/tripjack/parse-amendment";
import { normalizeTripJackBookingDetails } from "@/lib/tripjack/parse-booking-details";
import { extractTripJackProxyErrorMessage } from "@/lib/tripjack/extract-proxy-error";
import { canCancelBooking, canReleasePnr } from "@/lib/flights/booking-guards";
import { buildBookingDetailSyncPatch } from "@/lib/flights/booking-status-sync";
import { ensureFlightGuestCustomerAccess } from "@/lib/flights/flight-guest-access";
import {
  handleFlightBookingEmailTransition,
  sendFlightCancellationStatusEmail,
} from "@/lib/flights/notifications";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import type { FlightBookingRecord } from "@/lib/flights/types";

export { canCancelBooking, canReleasePnr };

function resolveCancellationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message || fallback;
  if (error && typeof error === "object") {
    const rec = error as Record<string, unknown>;
    return extractTripJackProxyErrorMessage(rec, fallback);
  }
  return fallback;
}

function collectPnrs(booking: FlightBookingRecord): string[] {
  const set = new Set<string>();
  if (booking.pnr) set.add(booking.pnr);
  if (booking.airlinePnr) set.add(booking.airlinePnr);
  const details = booking.bookingDetailNormalized ?? booking.normalizedBookingDetails;
  for (const p of details?.passengers ?? []) {
    if (p.pnr) set.add(p.pnr);
    if (p.ticketNumber) set.add(p.ticketNumber);
  }
  return [...set].filter(Boolean);
}

export async function refreshFlightBookingDetails(
  bookingId: string
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const tripjackBookingId = booking.tripjackBookingId;
  if (!tripjackBookingId) throw new Error("TripJack booking ID missing");

  const detailsResponse = await fetchTripJackBookingDetails(tripjackBookingId, {
    requirePaxPricing: true,
  });
  const normalized = normalizeTripJackBookingDetails(booking.bookResponse, detailsResponse);
  if (!normalized) throw new Error("Could not parse booking details");

  const patch = buildBookingDetailSyncPatch(booking, normalized, detailsResponse);
  patch.bookingDetailsPollStatus = normalized.orderStatus;

  const updated = await updateFlightBooking(bookingId, patch);

  if (!updated) throw new Error("Failed to save booking details");

  const { booking: withGuest } = await ensureFlightGuestCustomerAccess(updated);
  await handleFlightBookingEmailTransition(booking, withGuest);

  return withGuest;
}

export async function getFlightCancellationCharges(
  bookingId: string,
  remarks?: string
): Promise<{ booking: FlightBookingRecord; charges: NonNullable<FlightBookingRecord["cancellationChargesNormalized"]> }> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.tripjackBookingId) throw new Error("TripJack booking ID missing");

  const request = {
    bookingId: booking.tripjackBookingId,
    type: "CANCELLATION" as const,
    remarks: remarks ?? "Customer cancellation request",
  };

  let response: unknown;
  let charges: ReturnType<typeof normalizeCancellationCharges> = null;
  try {
    response = await fetchTripJackCancellationCharges({
      bookingId: booking.tripjackBookingId,
      remarks: request.remarks,
    });
    charges = normalizeCancellationCharges(response);
    if (!charges) throw new Error("Could not parse cancellation charges from TripJack response");
  } catch (error) {
    await updateFlightBooking(bookingId, {
      getChargesRequest: request,
      getChargesResponse: response ?? {
        success: false,
        error: resolveCancellationErrorMessage(error, "Failed to fetch cancellation charges"),
      },
      adminNotes: resolveCancellationErrorMessage(error, "Failed to fetch cancellation charges"),
    });
    throw new Error(resolveCancellationErrorMessage(error, "Failed to fetch cancellation charges"));
  }

  const updated = await updateFlightBooking(bookingId, {
    getChargesRequest: request,
    getChargesResponse: response,
    cancellationChargesNormalized: charges,
    cancellationCharges: charges.cancellationCharges,
    refundAmount: charges.refundableAmount,
    cancellationDeadline: charges.cancellationDeadline,
  });

  if (!updated) throw new Error("Failed to save cancellation charges");
  return { booking: updated, charges };
}

export async function submitFlightCancellation(
  bookingId: string,
  remarks?: string
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.tripjackBookingId) throw new Error("TripJack booking ID missing");

  const request = {
    bookingId: booking.tripjackBookingId,
    type: "CANCELLATION" as const,
    remarks: remarks ?? "Customer cancellation",
  };

  let response: unknown;
  let submitted: ReturnType<typeof normalizeSubmitAmendment> = null;
  try {
    response = await submitTripJackAmendment({
      bookingId: booking.tripjackBookingId,
      remarks: request.remarks,
    });
    submitted = normalizeSubmitAmendment(response);
    if (!submitted?.amendmentId) {
      throw new Error("Submit amendment failed — amendmentId missing");
    }
  } catch (error) {
    const failed = await updateFlightBooking(bookingId, {
      submitAmendmentRequest: request,
      submitAmendmentResponse: response ?? {
        success: false,
        error: resolveCancellationErrorMessage(error, "Cancellation request failed"),
      },
      status: "failed_cancellation",
      refundStatus: "failed",
      adminNotes: resolveCancellationErrorMessage(error, "Cancellation request failed"),
    });
    if (failed) {
      await sendFlightCancellationStatusEmail(failed, "failed");
    }
    throw new Error(resolveCancellationErrorMessage(error, "Cancellation request failed"));
  }

  const updated = await updateFlightBooking(bookingId, {
    submitAmendmentRequest: request,
    submitAmendmentResponse: response,
    amendmentId: submitted.amendmentId,
    status: "cancellation_requested",
    refundStatus: "pending",
    pollStatus: "polling",
  });

  if (!updated) throw new Error("Failed to save cancellation request");
  await sendFlightCancellationStatusEmail(updated, "request_submitted");
  return updated;
}

export async function pollFlightAmendment(bookingId: string): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.amendmentId) throw new Error("amendmentId missing");

  const response = await pollTripJackAmendment(booking.amendmentId);
  const polled = normalizePollAmendment(response);
  if (!polled) throw new Error("Could not parse poll amendment response");

  const statusUpper = polled.amendmentStatus.toUpperCase();
  const updates: Partial<FlightBookingRecord> = {
    pollAmendmentResponse: response,
    pollAmendmentNormalized: polled,
    pollStatus: (["SUCCESS", "FAILED", "CANCELLED"].includes(statusUpper)
      ? statusUpper
      : "polling") as FlightBookingRecord["pollStatus"],
    cancellationCharges: polled.amendmentCharges || booking.cancellationCharges,
    refundAmount: polled.refundableAmount || booking.refundAmount,
  };

  if (statusUpper === "SUCCESS") {
    updates.status = "cancelled";
    updates.refundStatus =
      (polled.refundableAmount ?? 0) > 0 ? "completed" : "completed";
    updates.paymentStatus =
      (polled.refundableAmount ?? 0) > 0 ? "refunded" : booking.paymentStatus;
    if ((polled.refundableAmount ?? 0) > 0) {
      updates.status = "refund_completed";
      updates.refundStatus = "completed";
    } else {
      updates.status = "cancelled";
    }
  } else if (statusUpper === "FAILED" || statusUpper === "CANCELLED") {
    updates.status = "failed_cancellation";
    updates.refundStatus = "failed";
    updates.adminNotes = `Amendment ${statusUpper}`;
  } else {
    updates.status = "cancellation_requested";
    updates.refundStatus = "processing";
  }

  const updated = await updateFlightBooking(bookingId, updates);
  if (!updated) throw new Error("Failed to save poll result");
  if (statusUpper === "SUCCESS") {
    await sendFlightCancellationStatusEmail(
      updated,
      updated.status === "refund_completed" ? "refund_completed" : "cancelled"
    );
  } else if (statusUpper === "FAILED" || statusUpper === "CANCELLED") {
    await sendFlightCancellationStatusEmail(updated, "failed");
  } else {
    await sendFlightCancellationStatusEmail(updated, "refund_processing");
  }
  return updated;
}

export async function releaseFlightPnr(bookingId: string): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.tripjackBookingId) throw new Error("TripJack booking ID missing");

  const isHold =
    booking.isHoldBooking ||
    booking.orderStatus === "ON_HOLD" ||
    booking.status === "hold";
  if (!isHold || booking.paymentStatus === "paid") {
    throw new Error("Release PNR is only allowed for unpaid hold bookings");
  }

  const pnrs = collectPnrs(booking);
  if (!pnrs.length) {
    throw new Error("No PNR available to release");
  }

  const request = { bookingId: booking.tripjackBookingId, pnrs };
  const response = await releaseTripJackPnr(request);

  const updated = await updateFlightBooking(bookingId, {
    releasePnrRequest: request,
    releasePnrResponse: response,
    releasePNRStatus: "released",
    status: "released",
    tripjackStatus: "released",
  });

  if (!updated) throw new Error("Failed to save release PNR result");
  return updated;
}
