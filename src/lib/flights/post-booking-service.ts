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
import { canCancelBooking, canReleasePnr } from "@/lib/flights/booking-guards";
import { buildBookingDetailSyncPatch } from "@/lib/flights/booking-status-sync";
import { ensureFlightGuestCustomerAccess } from "@/lib/flights/flight-guest-access";
import { handleFlightBookingEmailTransition } from "@/lib/flights/notifications";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import type { FlightBookingRecord } from "@/lib/flights/types";

export { canCancelBooking, canReleasePnr };

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

  const response = await fetchTripJackCancellationCharges({
    bookingId: booking.tripjackBookingId,
    remarks: request.remarks,
  });

  const charges = normalizeCancellationCharges(response);
  if (!charges) throw new Error("Could not parse cancellation charges");

  const updated = await updateFlightBooking(bookingId, {
    getChargesRequest: request,
    getChargesResponse: response,
    cancellationChargesNormalized: charges,
    cancellationCharges: charges.cancellationCharges,
    refundAmount: charges.refundableAmount,
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

  const response = await submitTripJackAmendment({
    bookingId: booking.tripjackBookingId,
    remarks: request.remarks,
  });

  const submitted = normalizeSubmitAmendment(response);
  if (!submitted?.amendmentId) {
    throw new Error("Submit amendment failed — amendmentId missing");
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
    updates.refundStatus = "failed";
    updates.adminNotes = `Amendment ${statusUpper}`;
  } else {
    updates.status = "cancellation_requested";
    updates.refundStatus = "processing";
  }

  const updated = await updateFlightBooking(bookingId, updates);
  if (!updated) throw new Error("Failed to save poll result");
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
