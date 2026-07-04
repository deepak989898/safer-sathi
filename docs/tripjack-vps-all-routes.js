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
const TRIPJACK_FARE_VALIDATE_URL =
  process.env.TRIPJACK_FARE_VALIDATE_URL || "https://apitest.tripjack.com/fms/v1/fare-validate";
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

// ========== 3. FARE VALIDATE (Phase 3) ==========
app.post("/api/tripjack/flights/fare-validate", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  if (!req.body?.travellerInfo || !Array.isArray(req.body.travellerInfo)) {
    return res.status(400).json({ success: false, error: "travellerInfo array is required" });
  }
  return forwardTripJack(res, TRIPJACK_FARE_VALIDATE_URL, req.body, "fare-validate");
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
