/**
 * Paste into /var/www/tripjack-proxy/server.js (alongside hotel listing routes).
 *
 * TripJack Hotel Pricing v3:
 * POST https://apitest-hms.tripjack.com/hms/v3/hotel/pricing
 *
 * Override: TRIPJACK_HOTEL_PRICING_URL
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_HOTEL_PRICING_URL =
  process.env.TRIPJACK_HOTEL_PRICING_URL ||
  "https://apitest-hms.tripjack.com/hms/v3/hotel/pricing";

app.post("/api/tripjack/hotels/pricing", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/pricing");
  console.log("[tripjack-proxy] Forwarding to:", TRIPJACK_HOTEL_PRICING_URL);
  console.log("[tripjack-proxy] Body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "TRIPJACK_API_KEY is not set on VPS",
    });
  }

  if (!requestBody?.correlationId) {
    return res.status(400).json({ success: false, error: "correlationId is required" });
  }

  const hid = requestBody.hid ?? requestBody.hotelId ?? requestBody.tjHotelId;
  if (hid === undefined || hid === null || hid === "") {
    return res.status(400).json({ success: false, error: "hid is required" });
  }

  if (!requestBody?.checkIn || !requestBody?.checkOut) {
    return res.status(400).json({
      success: false,
      error: "checkIn and checkOut are required (YYYY-MM-DD)",
    });
  }

  if (!requestBody?.rooms || !Array.isArray(requestBody.rooms) || !requestBody.rooms.length) {
    return res.status(400).json({ success: false, error: "rooms array is required" });
  }

  const upstreamBody = { ...requestBody, hid };

  const started = Date.now();

  try {
    const upstream = await fetch(TRIPJACK_HOTEL_PRICING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(upstreamBody),
    });

    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    console.log("[tripjack-proxy] Hotel pricing upstream status:", upstream.status, "ms:", elapsedMs);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[tripjack-proxy] Hotel pricing non-JSON response:", text.slice(0, 300));
      return res.status(upstream.status || 502).json({
        success: false,
        error: "Invalid JSON from TripJack Hotel pricing API",
        upstreamUrl: TRIPJACK_HOTEL_PRICING_URL,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error:
          data?.message ||
          data?.errors?.[0]?.message ||
          data?.errors?.[0]?.errCode ||
          "TripJack hotel pricing failed",
        upstreamUrl: TRIPJACK_HOTEL_PRICING_URL,
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
      upstreamUrl: TRIPJACK_HOTEL_PRICING_URL,
      upstreamStatus: upstream.status,
      elapsedMs,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error("[tripjack-proxy] Hotel pricing error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Hotel pricing proxy failed",
      upstreamUrl: TRIPJACK_HOTEL_PRICING_URL,
      elapsedMs: Date.now() - started,
    });
  }
});
