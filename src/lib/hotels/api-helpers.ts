import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError } from "@/lib/api-response";
import {
  assertTripJackHotelBookingAllowed as checkHotelBookingAllowed,
} from "@/lib/hotels/booking-gates";

export async function getHotelUserId(request: Request): Promise<string> {
  const auth = await optionalAuthenticateRequest(request);
  return auth?.id ?? "guest";
}

export async function requireHotelUserAuth(
  request: Request
): Promise<{ userId: string; email: string } | { error: Response }> {
  const auth = await optionalAuthenticateRequest(request);
  if (!auth?.id) {
    return { error: apiError("Please sign in to book hotels", 401, { code: "AUTH_REQUIRED" }) };
  }
  return { userId: auth.id, email: auth.email };
}

export async function assertTripJackHotelBookingAllowed(): Promise<
  { ok: true } | { error: Response }
> {
  const result = await checkHotelBookingAllowed();
  if ("error" in result) return { error: result.error };
  return { ok: true };
}

export function hotelApiError(error: unknown, fallback = "Request failed") {
  const raw = error instanceof Error ? error.message : fallback;
  console.error("[hotel-api]", raw);
  const customerSafe = sanitizeHotelCustomerError(raw);
  return apiError(customerSafe, 500, { internal: raw });
}

export function sanitizeHotelCustomerError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("upstream") || lower.includes("invalid json") || lower.includes("proxy") || lower.includes("tripjack")) {
    return "Hotel service is temporarily unavailable. Please try again shortly.";
  }
  if (lower.includes("timeout") || lower.includes("supplier_unavailable")) {
    return "Hotel supplier is busy. Please retry in a moment.";
  }
  if (lower.includes("invalid nested entity") || lower.includes("guestdetails")) {
    return "Guest details could not be saved. Please go back to Guests, check all fields, and try again.";
  }
  return message.length > 180 ? "Something went wrong. Our team has been notified." : message;
}
