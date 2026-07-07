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
    if (process.env.TRIPJACK_HOTEL_ALLOW_STAGING_BOOKING !== "true") {
      blockers.push("Staging hotel bookings are disabled (TRIPJACK_HOTEL_ALLOW_STAGING_BOOKING)");
    }
    return blockers;
  }

  const liveToggle = liveBookingEnabled || process.env.TRIPJACK_HOTEL_LIVE_BOOKING === "true";

  if (!liveToggle) {
    blockers.push("Live hotel booking is disabled — enable it in Admin → TripJack Hotels Ops");
  }

  if (!isRazorpayConfigured()) {
    blockers.push("Razorpay keys are not configured");
  } else if (liveToggle && !isRazorpayLiveConfigured()) {
    blockers.push(
      "Production requires live Razorpay keys (rzp_live_*) or enable test booking mode"
    );
  }

  if (!isTripJackHotelProductionDomain()) {
    blockers.push(
      "Production domain check failed — deploy on thesafarsathi.com or set TRIPJACK_HOTEL_ALLOW_VERCEL_PREVIEW=true"
    );
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

  if (getTripJackHotelEnvironment() === "staging") {
    return process.env.TRIPJACK_HOTEL_ALLOW_STAGING_BOOKING === "true";
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

  const message =
    blockers.length > 0
      ? `Hotel booking unavailable:\n${blockers.map((b) => `• ${b}`).join("\n")}`
      : "Hotel booking is temporarily unavailable. Please try again later or contact support.";

  return {
    blockers,
    error: apiError(message, 503, {
      code: "HOTEL_BOOKING_DISABLED",
      blockers,
      adminMessage: message,
    }),
  };
}
