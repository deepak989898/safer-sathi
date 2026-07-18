import { apiError } from "@/lib/api-response";
import { isHotelTestBookingEnabled } from "@/lib/hotels/test-booking";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import {
  getTripJackHotelEnvironment,
  isTripJackHotelLiveBookingAllowed,
  isTripJackHotelProviderEnabled,
  isTripJackHotelProductionDomain,
  isTripJackHotelVpsConfigured,
  isRazorpayLiveConfigured,
} from "@/lib/tripjack-hotels/config";
import { getTripJackHotelOpsMeta } from "@/lib/tripjack-hotels/ops-firestore";

function isCustomerFacingBlocker(message: string): boolean {
  const lower = message.toLowerCase();
  // Never show env-flag / staging-gate copy to customers.
  if (lower.includes("tripjack_hotel_allow_staging_booking")) return false;
  if (lower.includes("staging hotel bookings are disabled")) return false;
  if (lower.includes("tripjack_hotel_live_booking")) return false;
  if (lower.includes("tripjack_hotel_allow_vercel_preview")) return false;
  return true;
}

export function getHotelBookingBlockers(liveBookingEnabled = false): string[] {
  const blockers: string[] = [];

  if (!isTripJackHotelProviderEnabled()) {
    blockers.push("TripJack Hotels provider is disabled");
  }
  if (!isTripJackHotelVpsConfigured()) {
    blockers.push("TripJack VPS proxy URL is not configured");
  }

  if (isHotelTestBookingEnabled()) {
    return blockers;
  }

  const env = getTripJackHotelEnvironment();
  if (env === "staging") {
    // Staging HMS is allowed for customer checkout when Razorpay is configured.
    // Admin can reconcile TripJack confirmation manually if needed.
    if (!isRazorpayConfigured()) {
      blockers.push("Payment gateway is not configured");
    }
    return blockers;
  }

  const liveToggle = liveBookingEnabled || process.env.TRIPJACK_HOTEL_LIVE_BOOKING === "true";

  if (!liveToggle) {
    blockers.push("Live hotel booking is temporarily unavailable. Please contact support.");
  }

  if (!isRazorpayConfigured()) {
    blockers.push("Payment gateway is not configured");
  } else if (liveToggle && !isRazorpayLiveConfigured()) {
    blockers.push("Payment gateway is not ready for live bookings");
  }

  if (!isTripJackHotelProductionDomain()) {
    blockers.push("Hotel checkout is not available on this domain");
  }

  return blockers;
}

export function isHotelBookingCheckoutAllowed(liveBookingEnabled = false): boolean {
  if (!isTripJackHotelProviderEnabled() || !isTripJackHotelVpsConfigured()) {
    return false;
  }

  if (isHotelTestBookingEnabled()) {
    return true;
  }

  if (isTripJackHotelLiveBookingAllowed(liveBookingEnabled)) {
    return true;
  }

  const liveToggle = liveBookingEnabled || process.env.TRIPJACK_HOTEL_LIVE_BOOKING === "true";
  if (liveToggle && isRazorpayConfigured() && getTripJackHotelEnvironment() === "production") {
    return isTripJackHotelProductionDomain();
  }

  // Staging: allow Razorpay checkout without the staging-booking env flag.
  if (getTripJackHotelEnvironment() === "staging") {
    return isRazorpayConfigured();
  }

  return false;
}

export async function assertTripJackHotelBookingAllowed(): Promise<
  { ok: true } | { error: Response; blockers: string[] }
> {
  const ops = await getTripJackHotelOpsMeta();
  const blockers = getHotelBookingBlockers(ops.liveBookingEnabled);

  if (isHotelBookingCheckoutAllowed(ops.liveBookingEnabled)) {
    return { ok: true };
  }

  const customerBlockers = blockers.filter(isCustomerFacingBlocker);
  const message =
    customerBlockers.length > 0
      ? `Hotel booking unavailable:\n${customerBlockers.map((b) => `• ${b}`).join("\n")}`
      : "Hotel booking is temporarily unavailable. Please try again later or contact support.";

  return {
    blockers: customerBlockers,
    error: apiError(message, 503, {
      code: "HOTEL_BOOKING_DISABLED",
      blockers: customerBlockers,
      adminMessage: blockers.join("; ") || message,
    }),
  };
}
