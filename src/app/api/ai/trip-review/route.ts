import { submitTripReview } from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  userName: z.string(),
  bookingId: z.string().optional(),
  serviceType: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  destination: z.string().optional(),
  hotelName: z.string().optional(),
  vehicleName: z.string().optional(),
  rating: z.number().min(1).max(5),
  review: z.string().min(3),
  photos: z.array(z.string()).optional(),
  suggestions: z.string().optional(),
  complaints: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const rating = await submitTripReview(parsed.data);
    return apiSuccess({
      rating,
      message:
        rating.status === "pending"
          ? "Thank you! Your review will appear after admin approval."
          : "Thank you for your review!",
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Submit failed", 500);
  }
}
