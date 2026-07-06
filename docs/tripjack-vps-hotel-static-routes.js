/**
 * TripJack Hotel V3 static content routes for /var/www/tripjack-proxy/server.js
 *
 * Upstream (TripJack V3 — required):
 * - POST /hms/v3/content/fetch-hotel-mapping
 * - POST /hms/v3/content/fetch-hotel-content
 *
 * DEPRECATED — do NOT use:
 * - POST /hms/v3/fetch-static-hotels
 */

const TRIPJACK_HOTEL_STATIC_BASE =
  process.env.TRIPJACK_HOTEL_HMS_BASE ||
  process.env.TRIPJACK_HOTEL_STATIC_BASE ||
  "https://apitest-hms.tripjack.com";

const TRIPJACK_HOTEL_FETCH_MAPPING_URL =
  process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/content/fetch-hotel-mapping`;

const TRIPJACK_HOTEL_FETCH_CONTENT_URL =
  process.env.TRIPJACK_HOTEL_FETCH_CONTENT_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/content/fetch-hotel-content`;

// Paste forwardTripJackHotel helper from tripjack-vps-hotel-all-routes.js if not already present.

app.post("/api/tripjack/hotels/fetch-hotel-mapping", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/fetch-hotel-mapping");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_MAPPING_URL, req.body, "fetch-hotel-mapping");
});

app.post("/api/tripjack/hotels/fetch-hotel-content", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/fetch-hotel-content");
  const hotelIds = req.body?.hotelIds;
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
    return res.status(400).json({ success: false, error: "hotelIds array is required" });
  }
  if (hotelIds.length > 100) {
    return res.status(400).json({ success: false, error: "Maximum 100 hotelIds per request" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_CONTENT_URL, req.body, "fetch-hotel-content");
});
