import { hotelBookingToLegacyBooking } from "@/lib/hotels/booking-service";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getInvoiceDownloadUrl } from "@/lib/bookings/invoice-access";
import { sendEmail } from "@/lib/notifications/email";
import { sendViaResend, isResendConfigured } from "@/lib/email/resend";
import { getSmtpFromAddress, isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import { appUrl, SITE_CONTACT } from "@/lib/site-config";
import type { HotelBookingRecord } from "@/lib/hotels/types";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

async function deliverSimpleEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (isResendConfigured()) {
    await sendViaResend({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${input.text}</pre>`,
    });
    return;
  }
  if (isSmtpConfigured()) {
    await sendViaSmtp({
      from: getSmtpFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${input.text}</pre>`,
    });
    return;
  }
  await sendEmail({ to: input.to, subject: input.subject, text: input.text });
}

export async function sendHotelVoucherReadyNotification(
  booking: HotelBookingRecord
): Promise<void> {
  if (!booking.customerEmail) return;

  const legacy = hotelBookingToLegacyBooking(booking);
  const invoiceUrl = getInvoiceDownloadUrl(legacy.id, legacy.customerEmail);
  const voucherLine = booking.voucherUrl
    ? `\nVoucher: ${booking.voucherUrl}`
    : booking.confirmationNumber
      ? `\nConfirmation: ${booking.confirmationNumber}`
      : "";

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `Your hotel voucher for ${booking.hotelName} is ready.`,
    "",
    `Booking ID: ${booking.bookingId}`,
    `TripJack Ref: ${booking.tripjackBookingId}`,
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    voucherLine,
    "",
    `View booking: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`,
    `Download invoice: ${invoiceUrl}`,
    "",
    "Thank you for choosing Safar Sathi!",
    SITE_CONTACT.phone,
  ]
    .filter(Boolean)
    .join("\n");

  await deliverSimpleEmail({
    to: booking.customerEmail,
    subject: `Hotel voucher ready — ${booking.hotelName}`,
    text,
  });
}

export async function sendHotelCancellationRequestedNotification(
  booking: HotelBookingRecord
): Promise<void> {
  if (!booking.customerEmail) return;

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `We received your cancellation request for ${booking.hotelName}.`,
    `Booking ID: ${booking.bookingId}`,
    "",
    booking.expectedRefundAmount
      ? `Estimated refund: ${formatInr(booking.expectedRefundAmount)} (subject to hotel policy).`
      : "Refund will be assessed per cancellation policy.",
    "",
    `Track status: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`,
    "",
    SITE_CONTACT.phone,
  ].join("\n");

  await deliverSimpleEmail({
    to: booking.customerEmail,
    subject: `Hotel cancellation requested — ${booking.bookingId.slice(-8).toUpperCase()}`,
    text,
  });
}

export async function sendHotelCancellationConfirmedNotification(
  booking: HotelBookingRecord
): Promise<void> {
  if (!booking.customerEmail) return;

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `Your hotel booking at ${booking.hotelName} has been cancelled.`,
    `Booking ID: ${booking.bookingId}`,
    booking.cancellationCharge
      ? `Cancellation charge: ${formatInr(booking.cancellationCharge)}`
      : "",
    booking.expectedRefundAmount
      ? `Expected refund: ${formatInr(booking.expectedRefundAmount)} — our team will process this shortly.`
      : "",
    "",
    `View details: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`,
    "",
    SITE_CONTACT.phone,
  ]
    .filter(Boolean)
    .join("\n");

  await deliverSimpleEmail({
    to: booking.customerEmail,
    subject: `Hotel booking cancelled — ${booking.hotelName}`,
    text,
  });
}

export async function sendHotelRefundProcessedNotification(
  booking: HotelBookingRecord
): Promise<void> {
  if (!booking.customerEmail) return;

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `Your refund for ${booking.hotelName} has been processed.`,
    `Amount: ${formatInr(booking.refundAmount ?? booking.expectedRefundAmount ?? 0)}`,
    booking.refundReference ? `Reference: ${booking.refundReference}` : "",
    "",
    "Thank you for your patience.",
    SITE_CONTACT.phone,
  ]
    .filter(Boolean)
    .join("\n");

  await deliverSimpleEmail({
    to: booking.customerEmail,
    subject: `Refund processed — ${booking.hotelName}`,
    text,
  });
}

export async function resendHotelBookingEmail(
  booking: HotelBookingRecord,
  type: "confirmation" | "voucher" = "confirmation"
): Promise<void> {
  if (type === "voucher" && (booking.voucherUrl || booking.confirmationNumber)) {
    await sendHotelVoucherReadyNotification(booking);
    return;
  }
  await sendBookingConfirmationNotifications({
    booking: hotelBookingToLegacyBooking(booking),
  });
}
