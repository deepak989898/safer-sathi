/** TripJack Hotel API calls go through VPS proxy only — API key stays on VPS. */

const DEFAULT_TRIPJACK_PROXY_BASE = "http://178.128.151.233:4000";

/** Server + client-safe proxy base (no API key). */
export function getTripJackHotelProxyBaseUrl(): string {
  return (
    process.env.TRIPJACK_PROXY_BASE_URL ??
    process.env.NEXT_PUBLIC_TRIPJACK_PROXY_BASE_URL ??
    DEFAULT_TRIPJACK_PROXY_BASE
  ).replace(/\/$/, "");
}

export function getTripJackHotelProxyConfig() {
  const baseUrl = getTripJackHotelProxyBaseUrl();

  return {
    baseUrl,
    listingPath: "/api/tripjack/hotels/listing",
    listingUrl: `${baseUrl}/api/tripjack/hotels/listing`,
    detailPath: "/api/tripjack/hotels/detail",
    detailUrl: `${baseUrl}/api/tripjack/hotels/detail`,
    pricingPath: "/api/tripjack/hotels/pricing",
    pricingUrl: `${baseUrl}/api/tripjack/hotels/pricing`,
    reviewPath: "/api/tripjack/hotels/review",
    reviewUrl: `${baseUrl}/api/tripjack/hotels/review`,
    bookPath: "/api/tripjack/hotels/book",
    bookUrl: `${baseUrl}/api/tripjack/hotels/book`,
    bookingDetailsPath: "/api/tripjack/hotels/booking-details",
    bookingDetailsUrl: `${baseUrl}/api/tripjack/hotels/booking-details`,
    cancelBookingPath: "/api/tripjack/hotels/cancel-booking",
    cancelBookingUrl: `${baseUrl}/api/tripjack/hotels/cancel-booking`,
    fetchHotelMappingPath: "/api/tripjack/hotels/fetch-hotel-mapping",
    fetchHotelMappingUrl: `${baseUrl}/api/tripjack/hotels/fetch-hotel-mapping`,
    fetchHotelContentPath: "/api/tripjack/hotels/fetch-hotel-content",
    fetchHotelContentUrl: `${baseUrl}/api/tripjack/hotels/fetch-hotel-content`,
    nationalitiesPath: "/api/tripjack/hotels/nationalities",
    nationalitiesUrl: `${baseUrl}/api/tripjack/hotels/nationalities`,
  };
}

export const DEFAULT_HOTEL_NATIONALITY = "106";
export const DEFAULT_HOTEL_CURRENCY = "INR";

/** Provider flag — customer-facing hotel search/booking. */
export function isTripJackHotelProviderEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED !== "false";
}

export type TripJackHotelEnvironment = "staging" | "production";

/** HMS environment label (VPS upstream base is configured on server). */
export function getTripJackHotelEnvironment(): TripJackHotelEnvironment {
  return process.env.TRIPJACK_HOTEL_ENV === "production" ? "production" : "staging";
}

export function getTripJackHotelBaseUrlLabel(): string {
  return (
    process.env.TRIPJACK_HOTEL_BASE_URL ??
    (getTripJackHotelEnvironment() === "production"
      ? "https://hms.tripjack.com"
      : "https://apitest-hms.tripjack.com")
  );
}

export function isTripJackHotelVpsConfigured(): boolean {
  return Boolean(
    (process.env.TRIPJACK_PROXY_BASE_URL ?? process.env.NEXT_PUBLIC_TRIPJACK_PROXY_BASE_URL ?? "").trim()
  );
}

/** Production customer domain — blocks preview deploys unless explicitly allowed. */
export function isTripJackHotelProductionDomain(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    ""
  ).toLowerCase();
  if (!site) return true;
  if (site.includes("localhost") || site.includes("127.0.0.1")) return false;
  if (
    site.includes(".vercel.app") &&
    process.env.TRIPJACK_HOTEL_ALLOW_VERCEL_PREVIEW !== "true"
  ) {
    return false;
  }
  return true;
}

/** Live customer bookings allowed only when production env + live Razorpay + admin toggle. */
export function isTripJackHotelLiveBookingAllowed(liveBookingEnabled = false): boolean {
  if (!isTripJackHotelProviderEnabled()) return false;

  if (getTripJackHotelEnvironment() === "staging") {
    return process.env.TRIPJACK_HOTEL_ALLOW_STAGING_BOOKING === "true";
  }

  const liveToggle =
    liveBookingEnabled || process.env.TRIPJACK_HOTEL_LIVE_BOOKING === "true";

  return (
    liveToggle &&
    isRazorpayLiveConfigured() &&
    isTripJackHotelProductionDomain() &&
    isTripJackHotelVpsConfigured()
  );
}

export function isRazorpayLiveConfigured(): boolean {
  const key = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  return key.startsWith("rzp_live_");
}

export function getTripJackHotelEnvironmentSummary(liveBookingEnabled = false) {
  return {
    environment: getTripJackHotelEnvironment(),
    baseUrl: getTripJackHotelBaseUrlLabel(),
    proxyBaseUrl: getTripJackHotelProxyConfig().baseUrl,
    providerEnabled: isTripJackHotelProviderEnabled(),
    razorpayLive: isRazorpayLiveConfigured(),
    productionDomain: isTripJackHotelProductionDomain(),
    vpsConfigured: isTripJackHotelVpsConfigured(),
    liveBookingAllowed: isTripJackHotelLiveBookingAllowed(liveBookingEnabled),
    liveBookingEnabled,
  };
}

/** Temporary session TTL (ms) — auto-expire after 45 minutes. */
export const HOTEL_SESSION_TTL_MS = 45 * 60 * 1000;

/** Listing/pricing countdown shown to users (~15 minutes from search). */
export const HOTEL_SEARCH_SESSION_MS = 15 * 60 * 1000;
