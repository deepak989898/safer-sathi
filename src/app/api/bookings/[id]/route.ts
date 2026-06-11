import { getBookingById } from "@/lib/data-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getBookingById(id);

    if (!booking) {
      return apiError("Booking not found", 404);
    }

    return apiSuccess(booking);
  } catch (err) {
    console.error("Get booking error:", err);
    return apiError("Failed to fetch booking", 500);
  }
}
