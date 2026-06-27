import { adminBookingsHref } from "@/lib/admin/booking-admin-links";
import { createAdminNotification } from "@/lib/admin/notifications";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { resolveBookingLoginCredentials } from "@/lib/auth/booking-login-credentials";
import {
  sendAdminBookingAlert,
  sendBookingConfirmationNotifications,
} from "@/lib/bookings/booking-notifications";
import { upsertBooking } from "@/lib/data-service";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { awardBookingRewardPoints } from "@/lib/rewards/rewards-service";
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

  const bookingForNotify: Booking = {
    ...booking,
    bookingNumber: booking.bookingNumber.trim().toUpperCase(),
    paymentStatus: isFullyPaid ? "paid" : "partial",
    paidAmount,
    status: "confirmed",
    paymentPlan: input.paymentPlan ?? booking.paymentPlan,
    paymentFailureReason: undefined,
    lastPaymentAttemptAt: now,
    notes,
    updatedAt: now,
  };

  const persisted = await upsertBooking(bookingForNotify);
  let savedBooking = persisted ?? bookingForNotify;

  const loginProvisionResult = await provisionCustomerBookingLogin(savedBooking);
  const loginProvision = loginProvisionResult.ok
    ? {
        userId: loginProvisionResult.userId,
        email: loginProvisionResult.email,
        loginPassword: loginProvisionResult.loginPassword,
        created: loginProvisionResult.created,
      }
    : null;
  if (!loginProvisionResult.ok) {
    console.error(
      "confirmPaidBooking login provision failed:",
      loginProvisionResult.reason,
      loginProvisionResult.code
    );
  } else if (loginProvision) {
    savedBooking = { ...savedBooking, userId: loginProvision.userId };
  }

  const earned = await awardBookingRewardPoints(savedBooking);
  if (earned > 0) {
    savedBooking = {
      ...savedBooking,
      rewardPointsEarned: earned,
      updatedAt: now,
    };
    await upsertBooking(savedBooking);
  }

  const loginCredentials = resolveBookingLoginCredentials(
    savedBooking,
    loginProvision
  );

  await createAdminNotification({
    type: "booking_confirmed",
    title:
      input.notificationTitle ??
      `Booking confirmed — ${savedBooking.bookingNumber}`,
    message: `${savedBooking.customerName} · ${savedBooking.serviceName.en} · ${isFullyPaid ? "Paid in full" : "Partial payment"}`,
    href: adminBookingsHref(savedBooking),
    bookingId: savedBooking.id,
  });

  await sendAdminBookingAlert({
    booking: savedBooking,
    isFullyPaid,
    balanceDue,
  });

  if (input.sendConfirmation !== false) {
    await sendBookingConfirmationNotifications({
      booking: savedBooking,
      isFullyPaid,
      channels: ["email", "whatsapp", "sms"],
      loginEmail: loginCredentials.loginEmail,
      loginPassword: loginCredentials.loginPassword,
    });
  }

  return {
    booking: savedBooking,
    isFullyPaid,
    balanceDue,
    loginCredentials,
  };
}
