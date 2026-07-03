/**
 * Paste into /var/www/tripjack-proxy/server.js (after review route).
 *
 * TripJack Fare Validate V2 Instant:
 * POST https://apitest.tripjack.com/fms/v1/fare-validate
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_FARE_VALIDATE_URL =
  process.env.TRIPJACK_FARE_VALIDATE_URL || "https://apitest.tripjack.com/fms/v1/fare-validate";

app.post("/api/tripjack/flights/fare-validate", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/flights/fare-validate");
  console.log("[tripjack-proxy] Forwarding to:", TRIPJACK_FARE_VALIDATE_URL);
  console.log("[tripjack-proxy] Request body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "TRIPJACK_API_KEY is not set on VPS",
    });
  }

  if (!requestBody?.bookingId) {
    return res.status(400).json({
      success: false,
      error: "bookingId is required",
    });
  }

  if (!requestBody?.travellerInfo || !Array.isArray(requestBody.travellerInfo)) {
    return res.status(400).json({
      success: false,
      error: "travellerInfo array is required",
    });
  }

  try {
    const upstream = await fetch(TRIPJACK_FARE_VALIDATE_URL, {
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

    console.log("[tripjack-proxy] Fare validate upstream status:", upstream.status);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error:
          data?.message || data?.errors?.[0]?.message || "TripJack fare validate failed",
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
    console.error("[tripjack-proxy] Fare validate error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Proxy fare validate request failed",
    });
  }
});
