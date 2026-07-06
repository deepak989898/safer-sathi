import "server-only";

import { sendAdminBookingAlert } from "@/lib/bookings/booking-notifications";
import { hotelBookingToLegacyBooking } from "@/lib/hotels/booking-service";
import { ensureHotelGuestCustomerAccess } from "@/lib/hotels/hotel-guest-access";
import { sendHotelBookingFailedNotification } from "@/lib/hotels/notifications";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { createRazorpayRefund } from "@/lib/payments/razorpay";
import type { HotelBookingRecord } from "@/lib/hotels/types";

export async function processHotelBookingFailure(
  booking: HotelBookingRecord
): Promise<HotelBookingRecord> {
  if (booking.refundStatus === "REFUNDED" || booking.refundStatus === "PROCESSING") {
    return booking;
  }

  const failureReason =
    booking.adminNotes ||
    booking.tripjackStatus ||
    booking.bookingDetailsNormalized?.bookingStatus ||
    "Supplier rejected the booking";

  let refundReference: string | undefined;
  let refundStatus: HotelBookingRecord["refundStatus"] = "PENDING";
  let refundAmount = booking.totalFare;

  if (booking.razorpayPaymentId && booking.paymentStatus === "paid") {
    const refund = await createRazorpayRefund({
      paymentId: booking.razorpayPaymentId,
      amount: booking.totalFare,
      notes: {
        bookingId: booking.bookingId,
        reason: "hotel_booking_failed",
      },
    });
    if (refund) {
      refundReference = refund.id;
      refundStatus = refund.status === "processed" ? "REFUNDED" : "PROCESSING";
    } else {
      refundStatus = "MANUAL_REVIEW";
    }
  }

  const updated = await updateHotelBooking(booking.bookingId, {
    status: "booking_failed",
    tripjackStatus: booking.tripjackStatus ?? "FAILED",
    refundStatus,
    refundAmount,
    refundReference,
    refundProcessedAt: refundStatus === "REFUNDED" ? new Date().toISOString() : undefined,
    adminNotes: failureReason,
  });

  const record = updated ?? booking;
  const { loginCredentials } = await ensureHotelGuestCustomerAccess(record);

  if (!record.failedEmailSentAt) {
    try {
      await sendHotelBookingFailedNotification(record, loginCredentials);
      await updateHotelBooking(record.bookingId, {
        failedEmailSentAt: new Date().toISOString(),
      });
    } catch (emailError) {
      console.warn("[hotel-failed] customer email failed:", emailError);
    }
  }

  try {
    await sendAdminBookingAlert({
      booking: hotelBookingToLegacyBooking(record),
      isFullyPaid: true,
      balanceDue: 0,
    });
  } catch {
    /* non-blocking */
  }

  return (await getHotelBookingById(record.bookingId)) ?? record;
}
