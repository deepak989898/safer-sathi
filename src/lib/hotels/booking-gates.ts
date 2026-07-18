import { apiError } from "@/lib/api-response";
import { isHotelTestBookingEnabled } from "@/lib/hotels/test-booking";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import {
  isTripJackHotelProviderEnabled,
  isTripJackHotelVpsConfigured,
} from "@/lib/tripjack-hotels/config";
import { getTripJackHotelOpsMeta } from "@/lib/tripjack-hotels/ops-firestore";

/**
 * Customer checkout blockers. Keep these customer-safe — never mention env var names.
 * Razorpay-ready deployments are allowed so payment + invoice can complete;
 * TripJack confirmation can be reconciled by admin when needed.
 */
export function getHotelBookingBlockers(_liveBookingEnabled = false): string[] {
  const blockers: string[] = [];

  if (!isTripJackHotelProviderEnabled()) {
    blockers.push("Hotel booking is temporarily unavailable. Please contact support.");
  }
  if (!isTripJackHotelVpsConfigured()) {
    blockers.push("Hotel booking is temporarily unavailable. Please contact support.");
  }
  if (!isHotelTestBookingEnabled() && !isRazorpayConfigured()) {
    blockers.push("Payment gateway is not configured. Please contact support.");
  }

  return blockers;
}

export function isHotelBookingCheckoutAllowed(_liveBookingEnabled = false): boolean {
  if (!isTripJackHotelProviderEnabled()) return false;
  if (!isTripJackHotelVpsConfigured()) return false;
  if (isHotelTestBookingEnabled()) return true;
  return isRazorpayConfigured();
}

export async function assertTripJackHotelBookingAllowed(): Promise<
  { ok: true } | { error: Response; blockers: string[] }
> {
  // Ops meta is used elsewhere for admin toggles; checkout itself only needs Razorpay readiness.
  await getTripJackHotelOpsMeta().catch(() => null);

  const blockers = getHotelBookingBlockers();

  if (isHotelBookingCheckoutAllowed()) {
    return { ok: true };
  }

  const message =
    blockers[0] ??
    "Hotel booking is temporarily unavailable. Please try again later or contact support.";

  return {
    blockers,
    error: apiError(message, 503, {
      code: "HOTEL_BOOKING_DISABLED",
      blockers,
      adminMessage: blockers.join("; ") || message,
    }),
  };
}
