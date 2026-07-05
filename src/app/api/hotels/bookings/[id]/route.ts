import { apiError, apiSuccess } from "@/lib/api-response";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { getHotelBookingById } from "@/lib/hotels/firestore";
import { hotelApiError } from "@/lib/hotels/api-helpers";

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

    if (!isOwner && !isStaff && booking.paymentStatus !== "paid") {
      return apiError("Forbidden", 403);
    }

    return apiSuccess({ booking });
  } catch (err) {
    return hotelApiError(err, "Failed to load hotel booking");
  }
}
