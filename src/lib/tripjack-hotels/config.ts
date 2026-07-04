/** TripJack Hotel API calls go through VPS proxy only — API key stays on VPS. */

export function getTripJackHotelProxyConfig() {
  const baseUrl = (
    process.env.TRIPJACK_PROXY_BASE_URL ?? "http://178.128.151.233:4000"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    listingPath: "/api/tripjack/hotels/listing",
    listingUrl: `${baseUrl}/api/tripjack/hotels/listing`,
  };
}

export const DEFAULT_HOTEL_NATIONALITY = "106";
export const DEFAULT_HOTEL_CURRENCY = "INR";
