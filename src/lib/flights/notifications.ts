import "server-only";

import { sendAdminBookingAlert, sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getInvoiceDownloadUrl } from "@/lib/bookings/invoice-access";
import { flightBookingToLegacyBooking } from "@/lib/flights/flight-legacy-booking";
import { updateFlightBooking } from "@/lib/flights/firestore";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { sendViaResend, isResendConfigured } from "@/lib/email/resend";
import { getSmtpFromAddress, isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl, SITE_CONTACT } from "@/lib/site-config";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

async function deliverFlightEmail(input: {
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

export async function sendFlightBookingFailedAdminAlert(
  booking: FlightBookingRecord,
  errorMessage: string
): Promise<void> {
  const adminEmail =
    process.env.ADMIN_BOOKING_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    SITE_CONTACT.email;

  const detail = booking.bookErrorDetail;
  const text = [
    `Flight booking FAILED after payment — action required`,
    "",
    `Booking ID: ${booking.bookingId}`,
    `TripJack ID: ${booking.tripjackBookingId}`,
    `Customer: ${booking.customerName} <${booking.customerEmail}>`,
    `Route: ${booking.sourceCode} → ${booking.destinationCode}`,
    `Paid: ${formatInr(booking.totalFare)}`,
    `Razorpay: ${booking.razorpayPaymentId ?? "—"}`,
    "",
    `Error: ${errorMessage}`,
    detail?.upstreamStatus ? `Upstream status: ${detail.upstreamStatus}` : "",
    detail?.upstreamUrl ? `Upstream URL: ${detail.upstreamUrl}` : "",
    detail?.rawPreview ? `Raw preview: ${detail.rawPreview.slice(0, 400)}` : "",
    "",
    `Admin: ${appUrl(`/admin/flight-bookings/${booking.bookingId}`)}`,
    "Use Retry TripJack Book from admin detail page.",
  ]
    .filter(Boolean)
    .join("\n");

  await deliverFlightEmail({
    to: adminEmail,
    subject: `URGENT: Flight book failed after payment — ${booking.bookingId}`,
    text,
  });
}

export async function sendFlightConfirmationNotifications(
  booking: FlightBookingRecord
): Promise<void> {
  if (!booking.customerEmail) return;

  const legacy = flightBookingToLegacyBooking(booking);
  const ticketUrl = appUrl(`/flights/ticket/${booking.bookingId}`);
  const invoiceUrl = getInvoiceDownloadUrl(booking.bookingId, booking.customerEmail);

  await sendBookingConfirmationNotifications({
    booking: legacy,
    isFullyPaid: true,
  });

  const flightLines = [
    `Hi ${booking.customerName},`,
    "",
    `Your flight booking is confirmed.`,
    "",
    `Booking ID: ${booking.bookingId}`,
    booking.pnr ? `PNR: ${booking.pnr}` : "",
    booking.ticketNumber ? `Ticket: ${booking.ticketNumber}` : "",
    `Flight: ${booking.airlineName} ${booking.airlineCode} ${booking.flightNumber}`,
    `Route: ${booking.sourceCode} → ${booking.destinationCode}`,
    `Date: ${booking.travelDate}`,
    `Departure: ${booking.departureTime} · Arrival: ${booking.arrivalTime}`,
    `Fare paid: ${formatInr(booking.totalFare)}`,
    "",
    `Download ticket: ${ticketUrl}`,
    `Download invoice: ${invoiceUrl}`,
    "",
    SITE_CONTACT.phone,
  ]
    .filter(Boolean)
    .join("\n");

  await deliverFlightEmail({
    to: booking.customerEmail,
    subject: `Flight confirmed — ${booking.sourceCode} to ${booking.destinationCode}${booking.pnr ? ` · PNR ${booking.pnr}` : ""}`,
    text: flightLines,
  });

  try {
    await sendAdminBookingAlert({ booking: legacy, isFullyPaid: true, balanceDue: 0 });
  } catch {
    /* non-blocking */
  }

  await updateFlightBooking(booking.bookingId, {
    emailSentAt: new Date().toISOString(),
    invoiceSentAt: new Date().toISOString(),
  });
}
