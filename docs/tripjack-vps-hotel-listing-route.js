/**
 * Paste into /var/www/tripjack-proxy/server.js
 *
 * TripJack Hotel Listing v3:
 * POST https://apitest-hms.tripjack.com/hms/v3/hotel/listing
 *
 * Uses same TRIPJACK_API_KEY as flights.
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_HOTEL_LISTING_URL =
  process.env.TRIPJACK_HOTEL_LISTING_URL ||
  "https://apitest-hms.tripjack.com/hms/v3/hotel/listing";

app.post("/api/tripjack/hotels/listing", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/listing");
  console.log("[tripjack-proxy] Forwarding to:", TRIPJACK_HOTEL_LISTING_URL);
  console.log("[tripjack-proxy] Body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "TRIPJACK_API_KEY is not set on VPS",
    });
  }

  if (!requestBody?.checkIn || !requestBody?.checkOut) {
    return res.status(400).json({
      success: false,
      error: "checkIn and checkOut are required (YYYY-MM-DD)",
    });
  }

  if (!requestBody?.rooms || !Array.isArray(requestBody.rooms) || !requestBody.rooms.length) {
    return res.status(400).json({
      success: false,
      error: "rooms array is required",
    });
  }

  try {
    const upstream = await fetch(TRIPJACK_HOTEL_LISTING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[tripjack-proxy] Hotel listing non-JSON response:", text.slice(0, 300));
      return res.status(upstream.status || 502).json({
        success: false,
        error: "Invalid JSON from TripJack Hotel listing API",
        upstreamUrl: TRIPJACK_HOTEL_LISTING_URL,
        upstreamStatus: upstream.status,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }

    console.log("[tripjack-proxy] Hotel listing upstream status:", upstream.status);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error:
          data?.message ||
          data?.errors?.[0]?.message ||
          "TripJack hotel listing failed",
        upstreamUrl: TRIPJACK_HOTEL_LISTING_URL,
        upstreamStatus: upstream.status,
        upstreamData: data,
        data,
        status: { success: false, httpStatus: upstream.status },
      });
    }

    return res.json({
      success: true,
      data,
      upstreamUrl: TRIPJACK_HOTEL_LISTING_URL,
      upstreamStatus: upstream.status,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error("[tripjack-proxy] Hotel listing error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Hotel listing proxy failed",
      upstreamUrl: TRIPJACK_HOTEL_LISTING_URL,
    });
  }
});
