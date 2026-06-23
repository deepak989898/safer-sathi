import { generateInvoice } from "@/lib/documents/invoice";
import { deliverBookingConfirmationEmail } from "@/lib/email/booking-confirmation-mail";
import { getInvoiceDownloadUrl } from "@/lib/bookings/invoice-access";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { sendSMS } from "@/lib/notifications/sms";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { appUrl } from "@/lib/site-config";
import type { Booking } from "@/types";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function buildBookingWhatsAppMessage(input: {
  booking: Booking;
  isFullyPaid: boolean;
  balanceDue: number;
  includeInvoiceLink?: boolean;
}): string {
  const { booking, isFullyPaid, balanceDue, includeInvoiceLink = true } = input;
  const travelDate = booking.endDate
    ? `${booking.startDate} to ${booking.endDate}`
    : booking.startDate;
  const invoiceUrl = getInvoiceDownloadUrl(booking.id, booking.customerEmail);

  const lines = [
    `🎉 *Safar Sathi — Booking ${isFullyPaid ? "Confirmed" : "Update"}*`,
    "",
    `Hi ${booking.customerName},`,
    "",
    `Booking ID: *${booking.bookingNumber}*`,
    `Service: ${booking.serviceName.en}`,
    `Travel: ${travelDate}`,
    `Guests: ${booking.guests}`,
    `Total: ${formatInr(booking.amount)}`,
    `Paid: ${formatInr(booking.paidAmount ?? 0)}`,
  ];

  if (balanceDue > 0) {
    lines.push(`Balance due: ${formatInr(balanceDue)}`);
  }

  if (includeInvoiceLink) {
    lines.push("", `📄 Download invoice: ${invoiceUrl}`);
  }

  lines.push(
    "",
    `View bookings: ${appUrl("/my-bookings")}`,
    "",
    "Thank you for choosing Safar Sathi!",
    "📞 +91 9217290871",
    "🌐 www.thesafarsathi.com"
  );

  return lines.join("\n");
}

export interface BookingNotificationResult {
  email?: { delivery: string; detail?: string };
  whatsapp?: { success: boolean; demo?: boolean; error?: string };
  sms?: { success: boolean; demo?: boolean; error?: string };
}

export async function sendBookingConfirmationNotifications(input: {
  booking: Booking;
  isFullyPaid?: boolean;
  channels?: Array<"email" | "whatsapp" | "sms">;
  loginEmail?: string;
  loginPassword?: string;
}): Promise<BookingNotificationResult> {
  const booking = input.booking;
  const balanceDue = getBalanceDue(booking.amount, booking.paidAmount ?? 0);
  const isFullyPaid = input.isFullyPaid ?? balanceDue <= 0;
  const channels = input.channels ?? ["email", "whatsapp", "sms"];
  const result: BookingNotificationResult = {};

  if (channels.includes("email") && booking.customerEmail) {
    try {
      const pdf = await generateInvoice(booking);
      result.email = await deliverBookingConfirmationEmail({
        booking,
        pdf,
        isFullyPaid,
        balanceDue,
        loginEmail: input.loginEmail,
        loginPassword: input.loginPassword,
      });
    } catch (error) {
      result.email = {
        delivery: "none",
        detail: error instanceof Error ? error.message : "Email failed",
      };
    }
  }

  const message = buildBookingWhatsAppMessage({
    booking,
    isFullyPaid,
    balanceDue,
  });

  if (channels.includes("whatsapp") && booking.customerPhone) {
    result.whatsapp = await sendWhatsApp({
      to: booking.customerPhone,
      message,
    });
  }

  if (channels.includes("sms") && booking.customerPhone) {
    const smsText = isFullyPaid
      ? `Safar Sathi: Booking ${booking.bookingNumber} confirmed. Paid ${formatInr(booking.paidAmount ?? 0)}. Invoice sent to your email.`
      : `Safar Sathi: Advance received for ${booking.bookingNumber}. Paid ${formatInr(booking.paidAmount ?? 0)}. Balance ${formatInr(balanceDue)}.`;
    result.sms = await sendSMS({ to: booking.customerPhone, message: smsText });
  }

  return result;
}
