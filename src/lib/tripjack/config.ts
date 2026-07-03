/** TripJack requests go through DigitalOcean VPS proxy — API key stays on VPS only. */

export function getTripJackProxyConfig() {
  const baseUrl = (
    process.env.TRIPJACK_PROXY_BASE_URL ?? "http://178.128.151.233:4000"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    searchPath: "/api/tripjack/flights/search",
    searchUrl: `${baseUrl}/api/tripjack/flights/search`,
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
