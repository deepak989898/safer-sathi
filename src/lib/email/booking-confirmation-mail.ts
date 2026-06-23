import { getInvoiceDownloadUrl, getInvoiceFilename } from "@/lib/bookings/invoice-access";
import { isResendConfigured, sendViaResend } from "@/lib/email/resend";
import { getSmtpFromAddress, isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import { sendEmail } from "@/lib/notifications/email";
import { appUrl } from "@/lib/site-config";
import type { Booking } from "@/types";

export type BookingConfirmationDelivery = "resend" | "smtp" | "generic" | "none";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function buildBookingConfirmationContent(input: {
  booking: Booking;
  isFullyPaid: boolean;
  balanceDue: number;
  invoiceUrl?: string;
  loginEmail?: string;
  loginPassword?: string;
}) {
  const { booking, isFullyPaid, balanceDue, invoiceUrl, loginEmail, loginPassword } = input;
  const serviceName = booking.serviceName.en;
  const travelDate = booking.endDate
    ? `${booking.startDate} to ${booking.endDate}`
    : booking.startDate;

  const subject = isFullyPaid
    ? `Safar Sathi — Booking Confirmed (${booking.bookingNumber})`
    : `Safar Sathi — Advance Payment Received (${booking.bookingNumber})`;

  const paymentLine = isFullyPaid
    ? `Payment received in full: ${formatInr(booking.paidAmount ?? 0)}.`
    : `Advance received: ${formatInr(booking.paidAmount ?? 0)}. Balance due: ${formatInr(balanceDue)}.`;

  const text = [
    `Hello ${booking.customerName},`,
    "",
    isFullyPaid
      ? `Your Safar Sathi booking ${booking.bookingNumber} is confirmed.`
      : `We received your advance payment for booking ${booking.bookingNumber}.`,
    "",
    `Service: ${serviceName}`,
    `Travel date: ${travelDate}`,
    `Guests: ${booking.guests}`,
    `Total amount: ${formatInr(booking.amount)}`,
    paymentLine,
    "",
    "Your PDF invoice is attached to this email.",
    invoiceUrl ? `Download invoice: ${invoiceUrl}` : "",
    "",
    loginEmail && loginPassword
      ? [
          "--- Your Safar Sathi login ---",
          `Email: ${loginEmail}`,
          `Password: ${loginPassword} (your latest Booking ID)`,
          `Sign in: ${appUrl("/login")}`,
          "You can change your password after signing in from My Bookings.",
          "",
        ].join("\n")
      : "",
    `View bookings: ${appUrl("/my-bookings")}`,
    "",
    "Thank you for choosing Safar Sathi!",
    "support@thesafarsathi.com | +91 9217290871",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">
      <div style="background:#0c2444;border-radius:12px 12px 0 0;padding:20px 24px;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Safar Sathi</h1>
        <p style="margin:6px 0 0;color:#fdba74;font-size:13px;">Travel | Comfort | Trust</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <h2 style="margin:0 0 8px;color:#0c2444;font-size:20px;">
          ${isFullyPaid ? "Booking Confirmed" : "Advance Payment Received"}
        </h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 20px;">
          Hello <strong>${booking.customerName}</strong>,
          ${isFullyPaid
            ? ` your booking <strong>${booking.bookingNumber}</strong> is confirmed.`
            : ` we received your advance for booking <strong>${booking.bookingNumber}</strong>.`}
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Booking ID</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${booking.bookingNumber}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Service</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${serviceName}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Travel Date</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${travelDate}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Guests</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${booking.guests}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">Total</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${formatInr(booking.amount)}</td></tr>
          <tr><td style="padding:8px 0;">Paid</td><td style="padding:8px 0;text-align:right;color:#16a34a;font-weight:600;">${formatInr(booking.paidAmount ?? 0)}</td></tr>
          ${balanceDue > 0 ? `<tr><td style="padding:8px 0;">Balance Due</td><td style="padding:8px 0;text-align:right;color:#f97316;font-weight:600;">${formatInr(balanceDue)}</td></tr>` : ""}
        </table>
        <p style="margin:24px 0 12px;color:#475569;font-size:14px;">
          Your PDF invoice is attached. You can also download it anytime:
        </p>
        ${
          invoiceUrl
            ? `<a href="${invoiceUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Download Invoice</a>`
            : ""
        }
        ${
          loginEmail && loginPassword
            ? `<div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
          <p style="margin:0 0 8px;color:#0c2444;font-weight:600;font-size:14px;">Your Safar Sathi login</p>
          <p style="margin:0 0 4px;color:#334155;font-size:13px;"><strong>Email:</strong> ${loginEmail}</p>
          <p style="margin:0 0 12px;color:#334155;font-size:13px;"><strong>Password:</strong> ${loginPassword} <span style="color:#64748b;">(your latest Booking ID)</span></p>
          <a href="${appUrl("/login")}" style="display:inline-block;background:#0c2444;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600;">Sign in to My Bookings</a>
          <p style="margin:12px 0 0;color:#64748b;font-size:11px;">You can change your password after signing in.</p>
        </div>`
            : ""
        }
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Questions? Email support@thesafarsathi.com or call +91 9217290871.
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export async function deliverBookingConfirmationEmail(input: {
  booking: Booking;
  pdf: Uint8Array;
  isFullyPaid: boolean;
  balanceDue: number;
  loginEmail?: string;
  loginPassword?: string;
}): Promise<{ delivery: BookingConfirmationDelivery; detail?: string }> {
  const invoiceUrl = getInvoiceDownloadUrl(input.booking.id, input.booking.customerEmail);
  const { subject, text, html } = buildBookingConfirmationContent({
    booking: input.booking,
    isFullyPaid: input.isFullyPaid,
    balanceDue: input.balanceDue,
    invoiceUrl,
    loginEmail: input.loginEmail,
    loginPassword: input.loginPassword,
  });
  const filename = getInvoiceFilename(input.booking.bookingNumber);
  const attachment = {
    filename,
    content: Buffer.from(input.pdf),
    contentType: "application/pdf",
  };

  if (isResendConfigured()) {
    await sendViaResend({
      to: input.booking.customerEmail,
      subject,
      text,
      html,
      attachments: [attachment],
    });
    return { delivery: "resend" };
  }

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp({
      from: getSmtpFromAddress(),
      to: input.booking.customerEmail,
      replyTo: process.env.SMTP_REPLY_TO?.trim() || "support@thesafarsathi.com",
      subject,
      text,
      html,
      attachments: [attachment],
    });
    return { delivery: "smtp", detail: result.host };
  }

  const generic = await sendEmail({
    to: input.booking.customerEmail,
    subject,
    text: `${text}\n\nInvoice download: ${invoiceUrl}`,
    html,
  });

  if (generic.success) {
    return { delivery: "generic", detail: generic.demo ? "demo" : generic.messageId };
  }

  return { delivery: "none", detail: generic.error };
}
