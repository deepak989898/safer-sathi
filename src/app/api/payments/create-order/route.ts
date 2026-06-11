import { z } from "zod";
import { createOrder, getPublicRazorpayKeyId } from "@/lib/payments/razorpay";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  receipt: z.string().min(1),
  notes: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const order = await createOrder(parsed.data);
    return apiSuccess({
      ...order,
      keyId: getPublicRazorpayKeyId(),
    });
  } catch (err) {
    console.error("Create order error:", err);
    return apiError("Failed to create payment order", 500);
  }
}
