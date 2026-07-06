import { z } from "zod";
import { hotelApiError } from "@/lib/hotels/api-helpers";
import { revalidateHotelPriceBeforePayment } from "@/lib/hotels/price-revalidation";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await revalidateHotelPriceBeforePayment(parsed.data.bookingId);
    if (!result.ok) {
      return apiError(result.message ?? "Price verification failed", 400);
    }

    return apiSuccess(result);
  } catch (err) {
    return hotelApiError(err, "Price verification failed");
  }
}
