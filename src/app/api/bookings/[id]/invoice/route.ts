import { getBookingById } from "@/lib/data-service";
import { generateInvoice } from "@/lib/documents/invoice";
import {
  getInvoiceFilename,
  verifyInvoiceAccessToken,
} from "@/lib/bookings/invoice-access";
import { authorizeBookingRead } from "@/lib/bookings/booking-access";
import { apiError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") ?? "";

    const booking = await getBookingById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const tokenValid = verifyInvoiceAccessToken(
      booking.id,
      booking.customerEmail,
      token
    );

    if (!tokenValid) {
      const access = await authorizeBookingRead(request, booking);
      if ("error" in access) return access.error;
    }

    const pdf = await generateInvoice(booking);
    const filename = getInvoiceFilename(booking.bookingNumber);

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice download error:", error);
    return apiError("Failed to generate invoice", 500);
  }
}
