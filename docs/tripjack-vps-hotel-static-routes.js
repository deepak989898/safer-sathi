/**
 * Paste into /var/www/tripjack-proxy/server.js (below hotel listing/detail routes)
 *
 * TripJack Hotel static/content APIs (HMS v3):
 * - POST /hms/v3/fetch-static-hotels
 * - POST /hms/v3/fetch-static-hotels/deleted
 * - POST /hms/v3/content/fetch-hotel-mapping
 * - POST /hms/v3/hotel/static-detail
 * - POST /hms/v3/nationality-info
 *
 * Uses same TRIPJACK_API_KEY as flights/listing.
 *
 * If admin sync shows "Invalid JSON from TripJack hotel static API", the VPS is
 * returning HTML 404 — these routes are missing from server.js. Prefer pasting
 * docs/tripjack-vps-hotel-all-routes.js (complete hotel block).
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_HOTEL_STATIC_BASE =
  process.env.TRIPJACK_HOTEL_STATIC_BASE || "https://apitest-hms.tripjack.com";

const TRIPJACK_HOTEL_FETCH_STATIC_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/fetch-static-hotels`;

const TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/fetch-static-hotels/deleted`;

const TRIPJACK_HOTEL_FETCH_MAPPING_URL =
  process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/content/fetch-hotel-mapping`;

const TRIPJACK_HOTEL_STATIC_DETAIL_URL =
  process.env.TRIPJACK_HOTEL_STATIC_DETAIL_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/hotel/static-detail`;

const TRIPJACK_HOTEL_NATIONALITIES_URL =
  process.env.TRIPJACK_HOTEL_NATIONALITIES_URL ||
  `${TRIPJACK_HOTEL_STATIC_BASE}/hms/v3/nationality-info`;

async function forwardTripJackHotel(res, upstreamUrl, requestBody, label) {
  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "TRIPJACK_API_KEY is not set on VPS",
    });
  }

  const started = Date.now();
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(requestBody ?? {}),
    });

    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`[tripjack-proxy] Hotel ${label} non-JSON:`, text.slice(0, 300));
      return res.status(upstream.status || 502).json({
        success: false,
        error: `Invalid JSON from TripJack Hotel ${label} API`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }

    console.log(`[tripjack-proxy] Hotel ${label} upstream status:`, upstream.status, "ms:", elapsedMs);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error:
          data?.message ||
          data?.errors?.[0]?.message ||
          `TripJack hotel ${label} failed`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: data,
        data,
        status: { success: false, httpStatus: upstream.status },
      });
    }

    return res.json({
      success: true,
      data,
      upstreamUrl,
      upstreamStatus: upstream.status,
      elapsedMs,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error(`[tripjack-proxy] Hotel ${label} error:`, err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `Hotel ${label} proxy failed`,
      upstreamUrl,
      elapsedMs: Date.now() - started,
    });
  }
}

app.post("/api/tripjack/hotels/fetch-static-hotels", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/fetch-static-hotels");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_STATIC_URL, req.body, "fetch-static-hotels");
});

app.post("/api/tripjack/hotels/fetch-static-hotels/deleted", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/fetch-static-hotels/deleted");
  return forwardTripJackHotel(
    res,
    TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL,
    req.body,
    "fetch-static-hotels-deleted"
  );
});

app.post("/api/tripjack/hotels/fetch-hotel-mapping", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/fetch-hotel-mapping");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_MAPPING_URL, req.body, "fetch-hotel-mapping");
});

app.post("/api/tripjack/hotels/static-detail", async (req, res) => {
  if (!req.body?.hotelId && !req.body?.tjHotelId && !req.body?.hid) {
    return res.status(400).json({ success: false, error: "hotelId is required" });
  }
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/static-detail");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_STATIC_DETAIL_URL, req.body, "static-detail");
});

app.post("/api/tripjack/hotels/nationalities", async (req, res) => {
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/nationalities");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_NATIONALITIES_URL, req.body ?? {}, "nationalities");
});

// Optional GET alias for nationality-info
app.get("/api/tripjack/hotels/nationalities", async (req, res) => {
  console.log("[tripjack-proxy] GET /api/tripjack/hotels/nationalities");
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_NATIONALITIES_URL, {}, "nationalities");
});
