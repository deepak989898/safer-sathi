import { hotelBookingToLegacyBooking } from "@/lib/hotels/booking-service";
import { getHotelBookingById } from "@/lib/hotels/firestore";
import { generateInvoice } from "@/lib/documents/invoice";
import { getInvoiceFilename, verifyInvoiceAccessToken } from "@/lib/bookings/invoice-access";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { apiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getHotelBookingById(id);
    if (!booking) return apiError("Booking not found", 404);

    const auth = await optionalAuthenticateRequest(request);
    const isOwner =
      auth &&
      (booking.userId === auth.id ||
        booking.customerEmail.toLowerCase() === auth.email.toLowerCase());
    const isStaff = auth ? canShowAdminNav(auth.role) : false;
    const token = new URL(request.url).searchParams.get("token");
    const tokenOk = verifyInvoiceAccessToken(id, booking.customerEmail, token ?? "");

    if (!isOwner && !isStaff && !tokenOk) return apiError("Forbidden", 403);
    if (booking.paymentStatus !== "paid" && !isStaff) {
      return apiError("Invoice available after payment", 400);
    }

    const legacy = hotelBookingToLegacyBooking(booking);
    const pdf = await generateInvoice(legacy);
    const filename = getInvoiceFilename(legacy.bookingNumber);

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Hotel invoice error:", error);
    return apiError("Failed to generate invoice", 500);
  }
}
