import { getBookings } from "@/lib/data-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const bookings = await getBookings(userId);
    return apiSuccess(bookings);
  } catch (err) {
    console.error("List bookings error:", err);
    return apiError("Failed to list bookings", 500);
  }
}
