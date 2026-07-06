/**
 * ALL TripJack Hotel routes for /var/www/tripjack-proxy/server.js
 *
 * DIAGNOSIS: If sync shows "Invalid JSON from TripJack hotel static API" or
 * curl returns HTML "Cannot POST /api/tripjack/hotels/...", these routes are
 * NOT in server.js yet — .env alone does not add routes.
 *
 * STEPS:
 * 1. SSH: cd /var/www/tripjack-proxy
 * 2. Clean .env — use docs/tripjack-vps-hotel.env.example (no duplicate keys)
 * 3. Paste this ENTIRE block into server.js BEFORE app.listen(...)
 * 4. pm2 restart tripjack-proxy
 * 5. Test:
 *    curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4000/api/tripjack/hotels/fetch-static-hotels -H "Content-Type: application/json" -d '{}'
 *    Expect: 200 or 502 JSON — NOT 404 HTML
 */

const TRIPJACK_HOTEL_HMS_BASE =
  process.env.TRIPJACK_HOTEL_HMS_BASE ||
  process.env.TRIPJACK_HOTEL_STATIC_BASE ||
  "https://apitest-hms.tripjack.com";

const TRIPJACK_HOTEL_LISTING_URL =
  process.env.TRIPJACK_HOTEL_LISTING_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/listing`;
const TRIPJACK_HOTEL_DETAIL_URL =
  process.env.TRIPJACK_HOTEL_DETAIL_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/detail`;
const TRIPJACK_HOTEL_PRICING_URL =
  process.env.TRIPJACK_HOTEL_PRICING_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/pricing`;
const TRIPJACK_HOTEL_REVIEW_URL =
  process.env.TRIPJACK_HOTEL_REVIEW_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/review`;
const TRIPJACK_HOTEL_BOOK_URL =
  process.env.TRIPJACK_HOTEL_BOOK_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/book`;
const TRIPJACK_HOTEL_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_HOTEL_BOOKING_DETAILS_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/booking-details`;
const TRIPJACK_HOTEL_CANCEL_BOOKING_URL =
  process.env.TRIPJACK_HOTEL_CANCEL_BOOKING_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/cancel-booking`;
const TRIPJACK_HOTEL_FETCH_STATIC_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/fetch-static-hotels`;
const TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/fetch-static-hotels/deleted`;
const TRIPJACK_HOTEL_FETCH_MAPPING_URL =
  process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/content/fetch-hotel-mapping`;
const TRIPJACK_HOTEL_STATIC_DETAIL_URL =
  process.env.TRIPJACK_HOTEL_STATIC_DETAIL_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/static-detail`;
const TRIPJACK_HOTEL_NATIONALITIES_URL =
  process.env.TRIPJACK_HOTEL_NATIONALITIES_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/nationality-info`;

function formatUpstreamNonJsonError(upstream, text, upstreamUrl, label) {
  const trimmed = (text || "").trim();
  const isEmpty = !trimmed;
  if (upstream.status === 403 && isEmpty) {
    return {
      httpStatus: 403,
      body: {
        success: false,
        proxyRouteOk: true,
        error:
          "TripJack upstream returned 403 empty body. Verify HMS Static Content API access, API key permission and IP whitelist.",
        upstreamStatus: upstream.status,
        upstreamUrl,
        upstreamData: { raw: "" },
      },
    };
  }
  if (upstream.status === 403) {
    return {
      httpStatus: 403,
      body: {
        success: false,
        proxyRouteOk: true,
        error:
          "TripJack upstream returned 403. Verify HMS API access, API key permission and IP whitelist.",
        upstreamStatus: upstream.status,
        upstreamUrl,
        upstreamData: { raw: trimmed.slice(0, 500) },
      },
    };
  }
  return {
    httpStatus: upstream.status || 502,
    body: {
      success: false,
      proxyRouteOk: true,
      error: isEmpty
        ? `TripJack hotel ${label} returned empty response (HTTP ${upstream.status})`
        : `TripJack hotel ${label} returned non-JSON response`,
      upstreamStatus: upstream.status,
      upstreamUrl,
      upstreamData: { raw: trimmed.slice(0, 500) },
    },
  };
}

async function forwardTripJackHotelGet(res, upstreamUrl, label) {
  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }

  const started = Date.now();
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json", apikey: process.env.TRIPJACK_API_KEY },
    });

    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    let data;
    try {
      data = text.trim() ? JSON.parse(text) : null;
    } catch {
      console.error(`[tripjack-proxy] Hotel ${label} GET non-JSON:`, text.slice(0, 300));
      const formatted = formatUpstreamNonJsonError(upstream, text, upstreamUrl, label);
      return res.status(formatted.httpStatus).json({ ...formatted.body, elapsedMs });
    }

    console.log(`[tripjack-proxy] Hotel ${label} GET upstream:`, upstream.status, "ms:", elapsedMs);

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
    console.error(`[tripjack-proxy] Hotel ${label} GET error:`, err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `Hotel ${label} proxy failed`,
      upstreamUrl,
      elapsedMs: Date.now() - started,
    });
  }
}

async function forwardTripJackHotel(res, upstreamUrl, requestBody, label) {
  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
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
      data = text.trim() ? JSON.parse(text) : null;
    } catch {
      console.error(`[tripjack-proxy] Hotel ${label} non-JSON:`, text.slice(0, 300));
      const formatted = formatUpstreamNonJsonError(upstream, text, upstreamUrl, label);
      return res.status(formatted.httpStatus).json({ ...formatted.body, elapsedMs });
    }

    console.log(`[tripjack-proxy] Hotel ${label} upstream:`, upstream.status, "ms:", elapsedMs);

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

// --- Search & book flow ---
app.post("/api/tripjack/hotels/listing", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/listing");
  if (!requestBody?.checkIn || !requestBody?.checkOut) {
    return res.status(400).json({ success: false, error: "checkIn and checkOut are required" });
  }
  if (!requestBody?.rooms?.length) {
    return res.status(400).json({ success: false, error: "rooms array is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_LISTING_URL, requestBody, "listing");
});

app.post("/api/tripjack/hotels/detail", async (req, res) => {
  if (!req.body?.correlationId) {
    return res.status(400).json({ success: false, error: "correlationId is required" });
  }
  if (req.body?.hotelId === undefined || req.body?.hotelId === null || req.body?.hotelId === "") {
    return res.status(400).json({ success: false, error: "hotelId is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_DETAIL_URL, req.body, "detail");
});

app.post("/api/tripjack/hotels/pricing", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_PRICING_URL, req.body, "pricing")
);

app.post("/api/tripjack/hotels/review", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_REVIEW_URL, req.body, "review")
);

app.post("/api/tripjack/hotels/book", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_BOOK_URL, req.body, "book")
);

app.post("/api/tripjack/hotels/booking-details", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_BOOKING_DETAILS_URL, req.body, "booking-details")
);

app.post("/api/tripjack/hotels/cancel-booking", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_CANCEL_BOOKING_URL, req.body, "cancel-booking")
);

// --- Catalog sync (required for destination search) ---
app.post("/api/tripjack/hotels/fetch-static-hotels", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_STATIC_URL, req.body, "fetch-static-hotels")
);

app.post("/api/tripjack/hotels/fetch-static-hotels/deleted", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL, req.body, "fetch-static-hotels-deleted")
);

app.post("/api/tripjack/hotels/fetch-hotel-mapping", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_MAPPING_URL, req.body, "fetch-hotel-mapping")
);

app.post("/api/tripjack/hotels/static-detail", (req, res) => {
  if (!req.body?.hotelId && !req.body?.tjHotelId && !req.body?.hid) {
    return res.status(400).json({ success: false, error: "hotelId is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_STATIC_DETAIL_URL, req.body, "static-detail");
});

app.post("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_NATIONALITIES_URL, req.body ?? {}, "nationalities")
);

app.get("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotelGet(res, TRIPJACK_HOTEL_NATIONALITIES_URL, "nationalities")
);

// Optional health check for admin proxy tests (skip if already defined)
if (!global.__TRIPJACK_PROXY_HEALTH__) {
  global.__TRIPJACK_PROXY_HEALTH__ = true;
  app.get("/health", (req, res) => {
    const base =
      process.env.TRIPJACK_HOTEL_HMS_BASE ||
      process.env.TRIPJACK_HOTEL_STATIC_BASE ||
      "";
    res.json({
      ok: true,
      service: "Safar Sathi TripJack Proxy",
      env: base.includes("apitest") ? "staging" : "production",
    });
  });
}
