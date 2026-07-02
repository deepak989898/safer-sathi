import { listBusBookings } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const staff = await requireStaffAuth(request);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;

    if (!("error" in staff)) {
      const bookings = await listBusBookings({
        status: status as never,
        limit: 300,
      });
      return apiSuccess({ bookings });
    }

    const auth = await optionalAuthenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const bookings = await listBusBookings({
      userId: auth.id,
      email: auth.email,
      limit: 50,
    });
    return apiSuccess({ bookings });
  } catch (error) {
    return busApiError(error, "Failed to load bus bookings");
  }
}
