import { z } from "zod";
import { findBookingForLogin } from "@/lib/auth/booking-login-server";
import { findFlightBookingForLogin } from "@/lib/auth/flight-booking-login-server";
import {
  createBookingLoginCustomToken,
  provisionCustomerBookingLogin,
} from "@/lib/auth/booking-customer-access";
import { isFlightBookingIdPassword } from "@/lib/auth/booking-login-credentials";
import { provisionFlightBookingLogin } from "@/lib/flights/flight-guest-access";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  apiRateLimited,
  checkBookingLoginRateLimit,
} from "@/lib/security/rate-limit";

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

    const rateLimited = checkBookingLoginRateLimit(request, parsed.data.email);
    if (rateLimited) {
      return apiRateLimited(rateLimited.resetAt);
    }

    const bookingRef = parsed.data.bookingNumber.trim();
    const flightBooking = isFlightBookingIdPassword(bookingRef)
      ? await findFlightBookingForLogin(parsed.data.email, bookingRef)
      : null;

    if (flightBooking) {
      const provision = await provisionFlightBookingLogin(flightBooking);
      if (!provision.ok) {
        return apiError(provision.reason, 503, { code: provision.code });
      }

      const customToken = await createBookingLoginCustomToken(provision.userId);
      if (!customToken) {
        return apiError(
          "Could not start your sign-in session. Please try again in a minute or contact support@thesafarsathi.com.",
          503
        );
      }

      return apiSuccess({
        provisioned: true,
        customToken,
        email: provision.email,
        bookingNumber: provision.loginPassword,
        passwordUpdated: provision.passwordUpdated,
        bookingType: "flight",
      });
    }

    const booking = await findBookingForLogin(parsed.data.email, bookingRef);

    if (!booking) {
      return apiError(
        "No confirmed booking found for this email and Booking ID. Use your latest Booking ID as the password.",
        404
      );
    }

    const provision = await provisionCustomerBookingLogin(booking);
    if (!provision.ok) {
      return apiError(provision.reason, 503, { code: provision.code });
    }

    const customToken = await createBookingLoginCustomToken(provision.userId);
    if (!customToken) {
      return apiError(
        "Could not start your sign-in session. Please try again in a minute or contact support@thesafarsathi.com.",
        503
      );
    }

    return apiSuccess({
      provisioned: true,
      customToken,
      email: provision.email,
      bookingNumber: provision.loginPassword,
      passwordUpdated: provision.passwordUpdated,
      bookingType: "package",
    });
  } catch (err) {
    console.error("Booking login provision error:", err);
    return apiError("Failed to prepare booking login", 500);
  }
}
