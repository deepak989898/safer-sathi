import {
  createInvoiceAccessToken,
  getInvoiceFilename,
  verifyInvoiceAccessToken,
} from "@/lib/bookings/invoice-access";
import { appUrl } from "@/lib/site-config";

export { getInvoiceFilename, verifyInvoiceAccessToken };

export function getHotelInvoiceDownloadUrl(bookingId: string, customerEmail: string): string {
  const token = createInvoiceAccessToken(bookingId, customerEmail);
  return appUrl(`/api/hotels/bookings/${bookingId}/invoice?token=${token}`);
}
