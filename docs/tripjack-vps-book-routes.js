/**
 * Paste into /var/www/tripjack-proxy/server.js
 *
 * Endpoints:
 * - POST /oms/v1/air/book
 * - POST /oms/v1/air/booking-details
 * - POST /oms/v1/air/confirm-fare-before-ticket (override via TRIPJACK_CONFIRM_FARE_URL if docs differ)
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_BOOK_URL =
  process.env.TRIPJACK_BOOK_URL || "https://apitest.tripjack.com/oms/v1/air/book";
const TRIPJACK_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_BOOKING_DETAILS_URL ||
  "https://apitest.tripjack.com/oms/v1/air/booking-details";
const TRIPJACK_CONFIRM_FARE_URL =
  process.env.TRIPJACK_CONFIRM_FARE_URL ||
  "https://apitest.tripjack.com/oms/v1/air/confirm-fare-before-ticket";

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

app.post("/api/tripjack/flights/book", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_BOOK_URL, req.body, "book");
});

app.post("/api/tripjack/flights/booking-details", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_BOOKING_DETAILS_URL, req.body, "booking-details");
});

app.post("/api/tripjack/flights/confirm-fare-before-ticket", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJack(res, TRIPJACK_CONFIRM_FARE_URL, req.body, "confirm-fare");
});
