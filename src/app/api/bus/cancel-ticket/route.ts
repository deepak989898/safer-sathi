import { z } from "zod";
import { cancelBusBooking } from "@/lib/bus/booking-service";
import { getBusBookingById } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
  seatsToCancel: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await getBusBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);

    const staff = await requireStaffAuth(request);
    if ("error" in staff) {
      const auth = await optionalAuthenticateRequest(request);
      const allowed =
        auth &&
        (booking.userId === auth.id ||
          booking.customerEmail.toLowerCase() === auth.email?.toLowerCase());
      if (!allowed) return apiError("Unauthorized", 401);
    }

    if (booking.status !== "confirmed") {
      return apiError("Only confirmed bookings can be cancelled", 400);
    }

    const updated = await cancelBusBooking(parsed.data.bookingId, parsed.data.seatsToCancel);
    return apiSuccess({ booking: updated });
  } catch (error) {
    return busApiError(error, "Cancellation failed");
  }
}
