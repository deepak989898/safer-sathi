import { z } from "zod";
import { busApiError } from "@/lib/bus/api-helpers";
import { getTicket } from "@/lib/seatseller/client";
import { getBusBookingById } from "@/lib/bus/firestore";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  tin: z.string().optional(),
  bookingId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    let tin = parsed.data.tin;
    if (parsed.data.bookingId) {
      const booking = await getBusBookingById(parsed.data.bookingId);
      if (!booking?.tin) return apiError("Ticket not found", 404);
      tin = booking.tin;
    }
    if (!tin) return apiError("tin or bookingId required", 400);

    const ticket = await getTicket(tin, parsed.data.bookingId);
    return apiSuccess({ ticket, tin });
  } catch (error) {
    return busApiError(error, "Failed to fetch ticket");
  }
}
