import { getBookingById } from "@/lib/data-service";
import { authorizeBookingRead } from "@/lib/bookings/booking-access";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getBookingById(id);

    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const access = await authorizeBookingRead(request, booking);
    if ("error" in access) return access.error;

    return apiSuccess(booking);
  } catch (err) {
    console.error("Get booking error:", err);
    return apiError("Failed to fetch booking", 500);
  }
}
