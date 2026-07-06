import "server-only";

import { sendAdminBookingAlert } from "@/lib/bookings/booking-notifications";
import { hotelBookingToLegacyBooking } from "@/lib/hotels/booking-service";
import { processHotelBookingFailure } from "@/lib/hotels/failed-booking-service";
import { ensureHotelGuestCustomerAccess } from "@/lib/hotels/hotel-guest-access";
import {
  sendBookingConfirmationNotifications,
} from "@/lib/bookings/booking-notifications";
import {
  sendHotelBookingProcessingNotification,
  sendHotelVoucherReadyNotification,
} from "@/lib/hotels/notifications";
import {
  hasHotelVoucherMetadata,
  isHotelBookingConfirmedStatus,
  isHotelBookingTerminalFailure,
} from "@/lib/hotels/booking-status-helpers";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import type { HotelBookingRecord } from "@/lib/hotels/types";

export async function handleHotelBookingPollOutcome(
  booking: HotelBookingRecord
): Promise<void> {
  const fresh = (await getHotelBookingById(booking.bookingId)) ?? booking;

  if (isHotelBookingTerminalFailure(fresh)) {
    await processHotelBookingFailure(fresh);
    return;
  }

  if (isHotelBookingConfirmedStatus(fresh)) {
    const { booking: withGuest, loginCredentials } =
      await ensureHotelGuestCustomerAccess(fresh);

    if (!withGuest.confirmedEmailSentAt) {
      try {
        await sendBookingConfirmationNotifications({
          booking: hotelBookingToLegacyBooking(withGuest),
          isFullyPaid: true,
          loginEmail: loginCredentials?.loginEmail,
          loginPassword: loginCredentials?.loginPassword,
        });
        await updateHotelBooking(withGuest.bookingId, {
          emailSentAt: new Date().toISOString(),
          confirmedEmailSentAt: new Date().toISOString(),
          invoiceSentAt: new Date().toISOString(),
        });
      } catch (emailError) {
        console.warn("[hotel-poll] confirmation email failed:", emailError);
      }
    }

    if (hasHotelVoucherMetadata(withGuest) && !withGuest.voucherEmailSentAt) {
      try {
        await sendHotelVoucherReadyNotification(withGuest, loginCredentials);
        await updateHotelBooking(withGuest.bookingId, {
          voucherEmailSentAt: new Date().toISOString(),
        });
      } catch (emailError) {
        console.warn("[hotel-poll] voucher email failed:", emailError);
      }
    }
    return;
  }

  if (!fresh.processingEmailSentAt && fresh.paymentStatus === "paid") {
    try {
      const { loginCredentials } = await ensureHotelGuestCustomerAccess(fresh);
      await sendHotelBookingProcessingNotification(fresh, loginCredentials);
      await updateHotelBooking(fresh.bookingId, {
        processingEmailSentAt: new Date().toISOString(),
      });
    } catch (emailError) {
      console.warn("[hotel-poll] processing email failed:", emailError);
    }
  }

  try {
    await sendAdminBookingAlert({
      booking: hotelBookingToLegacyBooking(fresh),
      isFullyPaid: true,
      balanceDue: 0,
    });
  } catch {
    /* non-blocking */
  }
}
