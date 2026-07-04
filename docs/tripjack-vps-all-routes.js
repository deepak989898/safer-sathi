/**
 * COMPLETE TripJack proxy routes for /var/www/tripjack-proxy/server.js
 *
 * IMPORTANT:
 * - Do NOT replace your whole server.js with only book routes.
 * - Keep your existing Express app setup (express, cors, json, listen, TRIPJACK_API_KEY).
 * - Paste ALL routes below (search + review + fare-validate + book + booking-details + confirm-fare).
 * - If a route already exists, replace that route block only (avoid duplicates).
 *
 * After save:
 *   pm2 restart tripjack-proxy
 *   pm2 logs tripjack-proxy --lines 40
 *
 * Quick test from VPS:
 *   curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4000/api/tripjack/flights/review \
 *     -H "Content-Type: application/json" -d '{"priceIds":["test"]}'
 *   Expect: 400 or 200/502 JSON — NOT 404
 */

// ========== URLS ==========
const TRIPJACK_SEARCH_URL =
  process.env.TRIPJACK_SEARCH_URL || "https://apitest.tripjack.com/fms/v1/air-search-all";
const TRIPJACK_REVIEW_URL =
  process.env.TRIPJACK_REVIEW_URL || "https://apitest.tripjack.com/fms/v1/review";
const TRIPJACK_BOOK_URL =
  process.env.TRIPJACK_BOOK_URL || "https://apitest.tripjack.com/oms/v1/air/book";
const TRIPJACK_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_BOOKING_DETAILS_URL ||
  "https://apitest.tripjack.com/oms/v1/air/booking-details";
const TRIPJACK_CONFIRM_FARE_URL =
  process.env.TRIPJACK_CONFIRM_FARE_URL ||
  "https://apitest.tripjack.com/oms/v1/air/confirm-fare-before-ticket";

// ========== SHARED FORWARDER ==========
async function forwardTripJack(res, targetUrl, requestBody, label) {
  console.log(`[tripjack-proxy] POST ${label} →`, targetUrl);
  console.log("[tripjack-proxy] Body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`[tripjack-proxy] ${label} upstream status:`, upstream.status);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || `${label} failed`,
        data,
        status: { success: false, httpStatus: upstream.status },
      });
    }

    return res.json({
      success: true,
      data,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error(`[tripjack-proxy] ${label} error:`, err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `${label} proxy failed`,
    });
  }
}

// ========== 1. SEARCH (Phase 1) ==========
app.post("/api/tripjack/flights/search", async (req, res) => {
  if (!req.body?.searchQuery) {
    return res.status(400).json({ success: false, error: "searchQuery is required" });
  }
  return forwardTripJack(res, TRIPJACK_SEARCH_URL, req.body, "search");
});

// ========== 2. REVIEW (Phase 2) — THIS WAS MISSING (caused Invalid JSON / 404) ==========
app.post("/api/tripjack/flights/review", async (req, res) => {
  if (!req.body?.priceIds || !Array.isArray(req.body.priceIds) || !req.body.priceIds.length) {
    return res.status(400).json({ success: false, error: "priceIds array is required" });
  }
  return forwardTripJack(res, TRIPJACK_REVIEW_URL, { priceIds: req.body.priceIds }, "review");
});

// ========== 3. FARE VALIDATE V2 INSTANT (Phase 3) ==========
// Sample ZIP has request/response only (no URL). Phase 3 listed /fms/v1/fare-validate
// but UAT returns 404. Try documented candidates only; log which endpoint is used.
// Full block also in docs/tripjack-vps-fare-validate-route.js
const TRIPJACK_BASE = (process.env.TRIPJACK_BASE_URL || "https://apitest.tripjack.com").replace(
  /\/$/,
  ""
);
const FARE_VALIDATE_PATH_CANDIDATES = [
  "/fms/v1/air/fare-validate",
  "/oms/v1/air/fare-validate",
  "/fms/v1/fare-validate-v2",
  "/fms/v1/air/fare-validate-v2",
  "/fms/v1/air/fare-validate-instant",
  "/fms/v1/fare-validate",
];

app.post("/api/tripjack/flights/fare-validate", async (req, res) => {
  const requestBody = req.body;
  const candidates = process.env.TRIPJACK_FARE_VALIDATE_URL
    ? [process.env.TRIPJACK_FARE_VALIDATE_URL]
    : FARE_VALIDATE_PATH_CANDIDATES.map((path) => `${TRIPJACK_BASE}${path}`);

  console.log("[tripjack-proxy] POST /api/tripjack/flights/fare-validate");
  console.log("[tripjack-proxy] Fare-validate candidates:", candidates);
  console.log("[tripjack-proxy] Body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }
  if (!requestBody?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  if (!requestBody?.travellerInfo || !Array.isArray(requestBody.travellerInfo)) {
    return res.status(400).json({ success: false, error: "travellerInfo array is required" });
  }

  const attempts = [];
  try {
    for (const targetUrl of candidates) {
      console.log("[tripjack-proxy] Fare-validate trying endpoint:", targetUrl);
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.TRIPJACK_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });
      const text = await upstream.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      console.log(
        "[tripjack-proxy] Fare-validate upstream status:",
        upstream.status,
        "url:",
        targetUrl
      );
      attempts.push({ upstreamUrl: targetUrl, upstreamStatus: upstream.status });

      if (upstream.status === 404) {
        console.log("[tripjack-proxy] Fare-validate 404, trying next candidate");
        continue;
      }

      console.log("[tripjack-proxy] Fare-validate USING endpoint:", targetUrl);
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          success: false,
          error:
            data?.message || data?.errors?.[0]?.message || "TripJack fare validate failed",
          upstreamUrl: targetUrl,
          upstreamStatus: upstream.status,
          upstreamData: data,
          attempts,
          status: { success: false, httpStatus: upstream.status },
        });
      }
      return res.json({
        success: true,
        data,
        upstreamUrl: targetUrl,
        upstreamStatus: upstream.status,
        attempts,
        status: { success: true, httpStatus: upstream.status },
      });
    }

    const last = attempts[attempts.length - 1];
    return res.status(404).json({
      success: false,
      error:
        "TripJack Fare Validate V2 Instant path not found (all documented candidates returned 404). Set TRIPJACK_FARE_VALIDATE_URL to the exact docs URL.",
      upstreamUrl: last?.upstreamUrl || candidates[candidates.length - 1],
      upstreamStatus: 404,
      upstreamData: { message: "All candidate endpoints returned HTTP 404", candidates },
      attempts,
      status: { success: false, httpStatus: 404 },
    });
  } catch (err) {
    console.error("[tripjack-proxy] Fare validate error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Proxy fare validate request failed",
      upstreamUrl: attempts[attempts.length - 1]?.upstreamUrl || candidates[0],
      upstreamStatus: attempts[attempts.length - 1]?.upstreamStatus ?? null,
      upstreamData: null,
      attempts,
    });
  }
});

// ========== 4. BOOK (Phase 4) ==========
app.post("/api/tripjack/flights/book", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_BOOK_URL, req.body, "book");
});

// ========== 5. BOOKING DETAILS (Phase 4) ==========
app.post("/api/tripjack/flights/booking-details", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_BOOKING_DETAILS_URL, req.body, "booking-details");
});

// ========== 6. CONFIRM FARE BEFORE TICKET (Phase 4) ==========
app.post("/api/tripjack/flights/confirm-fare-before-ticket", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_CONFIRM_FARE_URL, req.body, "confirm-fare");
});
