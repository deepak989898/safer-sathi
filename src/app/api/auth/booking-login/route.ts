import { z } from "zod";
import { findBookingForLogin } from "@/lib/auth/booking-login-server";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  bookingNumber: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await findBookingForLogin(
      parsed.data.email,
      parsed.data.bookingNumber
    );

    if (!booking) {
      return apiError(
        "No confirmed booking found for this email and Booking ID. Use your latest Booking ID as the password.",
        404
      );
    }

    const provision = await provisionCustomerBookingLogin(booking);
    if (!provision) {
      return apiError(
        "Could not activate your login right now. Please try again in a minute or contact support@thesafarsathi.com.",
        503
      );
    }

    return apiSuccess({
      provisioned: true,
      email: provision.email,
      bookingNumber: provision.loginPassword,
    });
  } catch (err) {
    console.error("Booking login provision error:", err);
    return apiError("Failed to prepare booking login", 500);
  }
}
