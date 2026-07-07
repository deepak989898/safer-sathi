import { ensureHotelGuestCustomerAccess } from "@/lib/hotels/hotel-guest-access";
import { hotelBookingToLegacyBooking } from "@/lib/hotels/booking-service";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getHotelInvoiceDownloadUrl } from "@/lib/hotels/invoice-access";
import { resolveHotelLoginCredentials } from "@/lib/hotels/hotel-login-credentials";
import { sendEmail } from "@/lib/notifications/email";
import { sendViaResend, isResendConfigured } from "@/lib/email/resend";
import { getSmtpFromAddress, isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import { appUrl, SITE_CONTACT } from "@/lib/site-config";
import type { HotelBookingRecord } from "@/lib/hotels/types";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function buildHotelEmailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">
      <div style="background:#0c2444;border-radius:12px 12px 0 0;padding:20px 24px;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Safar Sathi</h1>
        <p style="margin:6px 0 0;color:#fdba74;font-size:13px;">Travel | Comfort | Trust</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <h2 style="margin:0 0 8px;color:#0c2444;font-size:20px;">${title}</h2>
        ${bodyHtml}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Questions? Email support@thesafarsathi.com or call ${SITE_CONTACT.phone}.
        </p>
      </div>
    </div>
  `;
}

async function deliverHotelEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (isResendConfigured()) {
    await sendViaResend({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return;
  }
  if (isSmtpConfigured()) {
    await sendViaSmtp({
      from: getSmtpFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return;
  }
  await sendEmail({ to: input.to, subject: input.subject, text: input.text });
}

export async function sendHotelVoucherReadyNotification(
  booking: HotelBookingRecord,
  loginCredentials?: { loginEmail: string; loginPassword: string } | null
): Promise<void> {
  if (!booking.customerEmail) return;

  const legacy = hotelBookingToLegacyBooking(booking);
  const invoiceUrl = getHotelInvoiceDownloadUrl(legacy.id, legacy.customerEmail);
  const guest = booking.guestDetails?.primaryGuest;
  const roomGuests = booking.guestDetails?.roomGuests?.flat() ?? [];
  const option = booking.reviewNormalized?.option;
  const voucherLine = booking.voucherUrl
    ? `\nVoucher: ${booking.voucherUrl}`
    : booking.confirmationNumber
      ? `\nConfirmation: ${booking.confirmationNumber}`
      : "";

  const loginBlock = loginCredentials
    ? [
        "",
        "My Bookings login:",
        `Email: ${loginCredentials.loginEmail}`,
        `Password: ${loginCredentials.loginPassword}`,
        `Sign in: ${appUrl("/login")}`,
      ]
    : [];

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `Your hotel voucher for ${booking.hotelName} is ready.`,
    "",
    `Booking ID: ${booking.bookingId}`,
    booking.supplierReference || booking.confirmationNumber
      ? `Hotel reference: ${booking.supplierReference || booking.confirmationNumber}`
      : "",
    `Status: ${booking.tripjackStatus ?? booking.status}`,
    "",
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    `Room: ${booking.roomName}`,
    `Meal basis: ${booking.mealBasis}`,
    guest?.address ? `Address: ${guest.address}, ${guest.city}` : "",
    roomGuests.length
      ? `Guests: ${roomGuests.map((g) => `${g.firstName} ${g.lastName}`).join(", ")}`
      : "",
    option
      ? `Cancellation: ${option.isRefundable ? "Refundable" : "Non-refundable"}${option.freeCancellationUntil ? ` until ${option.freeCancellationUntil}` : ""}`
      : "",
    `Amount paid: ${formatInr(booking.totalFare)}`,
    voucherLine,
    "",
    `View booking: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`,
    `Download invoice: ${invoiceUrl}`,
    ...loginBlock,
    "",
    "Thank you for choosing Safar Sathi!",
    SITE_CONTACT.phone,
  ]
    .filter(Boolean)
    .join("\n");

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Hotel voucher ready — ${booking.hotelName}`,
    text,
    html: buildHotelEmailShell(
      "Hotel Voucher Ready",
      `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;color:#475569;line-height:1.6;">${text}</pre>`
    ),
  });
}

export async function sendHotelBookingProcessingNotification(
  booking: HotelBookingRecord,
  loginCredentials?: { loginEmail: string; loginPassword: string } | null
): Promise<void> {
  if (!booking.customerEmail) return;
  if (booking.processingEmailSentAt) return;

  const loginBlock = loginCredentials
    ? [
        "",
        "Track in My Bookings:",
        `Email: ${loginCredentials.loginEmail}`,
        `Password: ${loginCredentials.loginPassword}`,
        appUrl("/login"),
      ]
    : [`Track status: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`];

  const text = [
    `Hi ${booking.customerName},`,
    "",
    "Payment received for your hotel booking. Confirmation is pending with the supplier.",
    "We will notify you shortly once your voucher is ready.",
    "",
    `Booking ID: ${booking.bookingId}`,
    `Hotel: ${booking.hotelName}`,
    `Check-in: ${booking.checkIn}`,
    `Check-out: ${booking.checkOut}`,
    `Amount: ${formatInr(booking.totalFare)}`,
    ...loginBlock,
    "",
    SITE_CONTACT.phone,
  ].join("\n");

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Hotel booking pending — ${booking.hotelName}`,
    text,
    html: buildHotelEmailShell(
      "Payment Received — Confirmation Pending",
      `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;color:#475569;line-height:1.6;">${text}</pre>`
    ),
  });
}

export async function sendHotelBookingFailedNotification(
  booking: HotelBookingRecord,
  loginCredentials?: { loginEmail: string; loginPassword: string } | null
): Promise<void> {
  if (!booking.customerEmail) return;

  const refundLine =
    booking.refundStatus === "REFUNDED" || booking.refundStatus === "PROCESSING"
      ? booking.refundStatus === "REFUNDED"
        ? `A refund of ${formatInr(booking.refundAmount ?? booking.totalFare)} has been initiated to your original payment method.`
        : `A refund of ${formatInr(booking.refundAmount ?? booking.totalFare)} is being processed.`
      : "Our team will process your refund according to our policy.";

  const loginBlock = loginCredentials
    ? [
        "",
        "Track status in My Bookings:",
        `Email: ${loginCredentials.loginEmail}`,
        `Password: ${loginCredentials.loginPassword}`,
        appUrl("/login"),
      ]
    : [`View booking: ${appUrl(`/hotels/booking/${booking.bookingId}`)}`];

  const text = [
    `Hi ${booking.customerName},`,
    "",
    `We could not confirm your hotel booking at ${booking.hotelName}.`,
    "Your payment will be refunded as per our policy.",
    "",
    `Booking ID: ${booking.bookingId}`,
    `Hotel: ${booking.hotelName}`,
    `Check-in: ${booking.checkIn}`,
    `Amount: ${formatInr(booking.totalFare)}`,
    refundLine,
    ...loginBlock,
    "",
    "We apologise for the inconvenience.",
    SITE_CONTACT.phone,
  ].join("\n");

  const html = buildHotelEmailShell(
    "Hotel Booking Could Not Be Confirmed",
    `
      <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
        Hello <strong>${booking.customerName}</strong>, we could not confirm your reservation at
        <strong>${booking.hotelName}</strong>. ${refundLine}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Booking ID</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${booking.bookingId}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Hotel</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${booking.hotelName}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Check-in</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${booking.checkIn}</td></tr>
        <tr><td style="padding:8px 0;">Amount paid</td><td style="padding:8px 0;text-align:right;font-weight:600;">${formatInr(booking.totalFare)}</td></tr>
      </table>
      ${
        loginCredentials
          ? `<div style="margin-top:20px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
              <p style="margin:0 0 8px;color:#991b1b;font-weight:600;">My Bookings login</p>
              <p style="margin:0;color:#64748b;font-size:13px;">Email: ${loginCredentials.loginEmail}<br/>Password: ${loginCredentials.loginPassword}</p>
            </div>`
          : ""
      }
      <a href="${appUrl(`/hotels/booking/${booking.bookingId}`)}" style="display:inline-block;margin-top:20px;background:#0c2444;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">View booking status</a>
    `
  );

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Hotel booking unsuccessful — ${booking.hotelName}`,
    text,
    html,
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

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Hotel cancellation requested — ${booking.bookingId.slice(-8).toUpperCase()}`,
    text,
    html: buildHotelEmailShell("Cancellation Request Received", `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;color:#475569;line-height:1.6;">${text}</pre>`),
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

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Hotel booking cancelled — ${booking.hotelName}`,
    text,
    html: buildHotelEmailShell("Booking Cancelled", `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;color:#475569;line-height:1.6;">${text}</pre>`),
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

  await deliverHotelEmail({
    to: booking.customerEmail,
    subject: `Refund processed — ${booking.hotelName}`,
    text,
    html: buildHotelEmailShell("Refund Processed", `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;color:#475569;line-height:1.6;">${text}</pre>`),
  });
}

export async function resendHotelBookingEmail(
  booking: HotelBookingRecord,
  type: "confirmation" | "voucher" = "confirmation"
): Promise<void> {
  const { loginCredentials } = await ensureHotelGuestCustomerAccess(booking);
  const credentials = loginCredentials ?? resolveHotelLoginCredentials(booking);

  if (type === "voucher" && (booking.voucherUrl || booking.confirmationNumber)) {
    await sendHotelVoucherReadyNotification(booking, credentials);
    return;
  }
  await sendBookingConfirmationNotifications({
    booking: hotelBookingToLegacyBooking(booking),
    isFullyPaid: booking.paymentStatus === "paid",
    loginEmail: credentials.loginEmail,
    loginPassword: credentials.loginPassword,
  });
}
