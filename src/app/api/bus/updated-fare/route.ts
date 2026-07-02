import { z } from "zod";
import { getBusBookingById } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { getUpdatedFare } from "@/lib/seatseller/client";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  blockKey: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    let blockKey = parsed.data.blockKey;
    if (parsed.data.bookingId) {
      const booking = await getBusBookingById(parsed.data.bookingId);
      if (!booking?.blockKey) return apiError("Booking block key not found", 404);
      blockKey = booking.blockKey;
    }

    if (!blockKey) return apiError("blockKey or bookingId required", 400);

    const fare = await getUpdatedFare(blockKey, parsed.data.bookingId);
    return apiSuccess({ fare });
  } catch (error) {
    return busApiError(error, "Failed to get updated fare");
  }
}
