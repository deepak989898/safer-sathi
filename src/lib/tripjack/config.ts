/** TripJack requests go through DigitalOcean VPS proxy — API key stays on VPS only. */

export function getTripJackProxyConfig() {
  const baseUrl = (
    process.env.TRIPJACK_PROXY_BASE_URL ?? "http://178.128.151.233:4000"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    searchPath: "/api/tripjack/flights/search",
    searchUrl: `${baseUrl}/api/tripjack/flights/search`,
    reviewPath: "/api/tripjack/flights/review",
    reviewUrl: `${baseUrl}/api/tripjack/flights/review`,
    fareValidatePath: "/api/tripjack/flights/fare-validate",
    fareValidateUrl: `${baseUrl}/api/tripjack/flights/fare-validate`,
    bookPath: "/api/tripjack/flights/book",
    bookUrl: `${baseUrl}/api/tripjack/flights/book`,
    bookingDetailsPath: "/api/tripjack/flights/booking-details",
    bookingDetailsUrl: `${baseUrl}/api/tripjack/flights/booking-details`,
    confirmFarePath: "/api/tripjack/flights/confirm-fare-before-ticket",
    confirmFareUrl: `${baseUrl}/api/tripjack/flights/confirm-fare-before-ticket`,
  };
}

export const CABIN_CLASSES = [
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
] as const;

export type CabinClass = (typeof CABIN_CLASSES)[number];

export const FARE_TYPES = ["REGULAR", "STUDENT", "SENIOR_CITIZEN"] as const;

export type FareType = (typeof FARE_TYPES)[number];
