import { adminBookingsHref } from "@/lib/admin/booking-admin-links";
import { createAdminNotification } from "@/lib/admin/notifications";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { resolveBookingLoginCredentials } from "@/lib/auth/booking-login-credentials";
import {
  sendAdminBookingAlert,
  sendBookingConfirmationNotifications,
} from "@/lib/bookings/booking-notifications";
import { updateBooking } from "@/lib/data-service";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import type { Booking } from "@/types";

export interface ConfirmPaidBookingInput {
  booking: Booking;
  paidAmount: number;
  paymentPlan?: Booking["paymentPlan"];
  recoveryNote?: string;
  sendConfirmation?: boolean;
  notificationTitle?: string;
}

export interface ConfirmPaidBookingResult {
  booking: Booking;
  isFullyPaid: boolean;
  balanceDue: number;
  loginCredentials: { loginEmail: string; loginPassword: string };
}

export async function confirmPaidBooking(
  input: ConfirmPaidBookingInput
): Promise<ConfirmPaidBookingResult> {
  const { booking, paidAmount, recoveryNote } = input;
  const balanceDue = getBalanceDue(booking.amount, paidAmount);
  const isFullyPaid = balanceDue <= 0;
  const now = new Date().toISOString();

  const notes = recoveryNote
    ? [booking.notes, recoveryNote].filter(Boolean).join("\n")
    : booking.notes;

  const updated = await updateBooking(booking.id, {
    paymentStatus: isFullyPaid ? "paid" : "partial",
    paidAmount,
    status: "confirmed",
    paymentPlan: input.paymentPlan ?? booking.paymentPlan,
    paymentFailureReason: undefined,
    lastPaymentAttemptAt: now,
    notes,
  });

  const bookingForNotify: Booking = updated ?? {
    ...booking,
    paymentStatus: isFullyPaid ? "paid" : "partial",
    paidAmount,
    status: "confirmed",
    paymentPlan: input.paymentPlan ?? booking.paymentPlan,
    paymentFailureReason: undefined,
    lastPaymentAttemptAt: now,
    notes,
  };

  const loginProvision = await provisionCustomerBookingLogin(bookingForNotify);
  const loginCredentials = resolveBookingLoginCredentials(
    bookingForNotify,
    loginProvision
  );

  await createAdminNotification({
    type: "booking_confirmed",
    title:
      input.notificationTitle ??
      `Booking confirmed — ${bookingForNotify.bookingNumber}`,
    message: `${bookingForNotify.customerName} · ${bookingForNotify.serviceName.en} · ${isFullyPaid ? "Paid in full" : "Partial payment"}`,
    href: adminBookingsHref(bookingForNotify),
    bookingId: bookingForNotify.id,
  });

  await sendAdminBookingAlert({
    booking: bookingForNotify,
    isFullyPaid,
    balanceDue,
  });

  if (input.sendConfirmation !== false) {
    await sendBookingConfirmationNotifications({
      booking: bookingForNotify,
      isFullyPaid,
      channels: ["email", "whatsapp", "sms"],
      loginEmail: loginCredentials.loginEmail,
      loginPassword: loginCredentials.loginPassword,
    });
  }

  return {
    booking: bookingForNotify,
    isFullyPaid,
    balanceDue,
    loginCredentials,
  };
}
