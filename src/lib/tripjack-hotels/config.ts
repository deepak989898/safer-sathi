/** TripJack Hotel API calls go through VPS proxy only — API key stays on VPS. */

export function getTripJackHotelProxyConfig() {
  const baseUrl = (
    process.env.TRIPJACK_PROXY_BASE_URL ?? "http://178.128.151.233:4000"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    listingPath: "/api/tripjack/hotels/listing",
    listingUrl: `${baseUrl}/api/tripjack/hotels/listing`,
    detailPath: "/api/tripjack/hotels/detail",
    detailUrl: `${baseUrl}/api/tripjack/hotels/detail`,
  };
}

export const DEFAULT_HOTEL_NATIONALITY = "106";
export const DEFAULT_HOTEL_CURRENCY = "INR";

/** Provider flag — Super Admin can toggle via env later. */
export function isTripJackHotelProviderEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED !== "false";
}

/** Temporary session TTL (ms) — auto-expire after 45 minutes. */
export const HOTEL_SESSION_TTL_MS = 45 * 60 * 1000;
