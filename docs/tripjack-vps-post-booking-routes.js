/**
 * Post-booking management routes for /var/www/tripjack-proxy/server.js
 *
 * Sample zips contain request/response bodies only (no URL paths).
 * Upstream paths follow existing OMS air family used by Book / Booking Details:
 *   POST /oms/v1/air/booking-details
 *   POST /oms/v1/air/get-charges
 *   POST /oms/v1/air/submit-amendment
 *   POST /oms/v1/air/poll-amendment
 *   POST /oms/v1/air/unhold   (Release PNR for hold bookings)
 *
 * Override via env if partner docs differ:
 *   TRIPJACK_BOOKING_DETAILS_URL
 *   TRIPJACK_GET_CHARGES_URL
 *   TRIPJACK_SUBMIT_AMENDMENT_URL
 *   TRIPJACK_POLL_AMENDMENT_URL
 *   TRIPJACK_RELEASE_PNR_URL
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_BASE = (process.env.TRIPJACK_BASE_URL || "https://apitest.tripjack.com").replace(
  /\/$/,
  ""
);

const TRIPJACK_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_BOOKING_DETAILS_URL || `${TRIPJACK_BASE}/oms/v1/air/booking-details`;
const TRIPJACK_GET_CHARGES_URL =
  process.env.TRIPJACK_GET_CHARGES_URL || `${TRIPJACK_BASE}/oms/v1/air/get-charges`;
const TRIPJACK_SUBMIT_AMENDMENT_URL =
  process.env.TRIPJACK_SUBMIT_AMENDMENT_URL || `${TRIPJACK_BASE}/oms/v1/air/submit-amendment`;
const TRIPJACK_POLL_AMENDMENT_URL =
  process.env.TRIPJACK_POLL_AMENDMENT_URL || `${TRIPJACK_BASE}/oms/v1/air/poll-amendment`;
const TRIPJACK_RELEASE_PNR_URL =
  process.env.TRIPJACK_RELEASE_PNR_URL || `${TRIPJACK_BASE}/oms/v1/air/unhold`;

async function forwardTripJackPost(res, targetUrl, requestBody, label) {
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
        upstreamUrl: targetUrl,
        upstreamStatus: upstream.status,
        upstreamData: data,
        data,
        status: { success: false, httpStatus: upstream.status },
      });
    }

    return res.json({
      success: true,
      data,
      upstreamUrl: targetUrl,
      upstreamStatus: upstream.status,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error(`[tripjack-proxy] ${label} error:`, err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `${label} proxy failed`,
      upstreamUrl: targetUrl,
    });
  }
}

// Alias (singular) — same upstream as booking-details
app.post("/api/tripjack/flights/booking-detail", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJackPost(res, TRIPJACK_BOOKING_DETAILS_URL, req.body, "booking-detail");
});

// Keep plural route if not already present
app.post("/api/tripjack/flights/booking-details", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJackPost(res, TRIPJACK_BOOKING_DETAILS_URL, req.body, "booking-details");
});

app.post("/api/tripjack/flights/get-charges", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  if (!req.body?.type) {
    return res.status(400).json({ success: false, error: "type is required (e.g. CANCELLATION)" });
  }
  return forwardTripJackPost(res, TRIPJACK_GET_CHARGES_URL, req.body, "get-charges");
});

app.post("/api/tripjack/flights/submit-amendment", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  if (!req.body?.type) {
    return res.status(400).json({ success: false, error: "type is required (e.g. CANCELLATION)" });
  }
  return forwardTripJackPost(res, TRIPJACK_SUBMIT_AMENDMENT_URL, req.body, "submit-amendment");
});

app.post("/api/tripjack/flights/poll-amendment", async (req, res) => {
  if (!req.body?.amendmentId) {
    return res.status(400).json({ success: false, error: "amendmentId is required" });
  }
  return forwardTripJackPost(res, TRIPJACK_POLL_AMENDMENT_URL, req.body, "poll-amendment");
});

app.post("/api/tripjack/flights/release-pnr", async (req, res) => {
  if (!req.body?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }
  return forwardTripJackPost(res, TRIPJACK_RELEASE_PNR_URL, req.body, "release-pnr");
});
