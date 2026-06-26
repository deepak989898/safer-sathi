import { getBookings } from "@/lib/data-service";
import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const bookings = await getBookings(userId);
    return apiSuccess(bookings);
  } catch (err) {
    console.error("List bookings error:", err);
    return apiError("Failed to list bookings", 500);
  }
}
