import { createHmac, timingSafeEqual } from "crypto";
import { appUrl } from "@/lib/site-config";

function getInvoiceSecret(): string {
  return (
    process.env.BOOKING_INVOICE_SECRET?.trim() ||
    process.env.RAZORPAY_KEY_SECRET?.trim() ||
    "safar-sathi-invoice-dev"
  );
}

export function createInvoiceAccessToken(bookingId: string, email: string): string {
  return createHmac("sha256", getInvoiceSecret())
    .update(`${bookingId}:${email.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyInvoiceAccessToken(
  bookingId: string,
  email: string,
  token: string
): boolean {
  if (!token?.trim()) return false;
  const expected = createInvoiceAccessToken(bookingId, email);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token.trim()));
  } catch {
    return false;
  }
}

export function getInvoiceDownloadUrl(bookingId: string, customerEmail: string): string {
  const token = createInvoiceAccessToken(bookingId, customerEmail);
  return appUrl(`/api/bookings/${bookingId}/invoice?token=${token}`);
}

export function getInvoiceFilename(bookingNumber: string): string {
  const safe = bookingNumber.replace(/[^a-zA-Z0-9-]/g, "");
  return `SafarSathi-Invoice-${safe}.pdf`;
}
