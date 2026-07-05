/**
 * Paste into /var/www/tripjack-proxy/server.js
 *
 * TripJack Hotel Book v3:
 * POST https://apitest-hms.tripjack.com/hms/v3/hotel/book
 *
 * pm2 restart tripjack-proxy
 */

const TRIPJACK_HOTEL_BOOK_URL =
  process.env.TRIPJACK_HOTEL_BOOK_URL ||
  "https://apitest-hms.tripjack.com/hms/v3/hotel/book";

app.post("/api/tripjack/hotels/book", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/hotels/book");
  console.log("[tripjack-proxy] Forwarding to:", TRIPJACK_HOTEL_BOOK_URL);
  console.log("[tripjack-proxy] Body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }

  if (!requestBody?.bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }

  const started = Date.now();

  try {
    const upstream = await fetch(TRIPJACK_HOTEL_BOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(upstream.status || 502).json({
        success: false,
        error: "Invalid JSON from TripJack Hotel book API",
        upstreamUrl: TRIPJACK_HOTEL_BOOK_URL,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }

    console.log("[tripjack-proxy] Hotel book upstream status:", upstream.status, "ms:", elapsedMs);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error:
          data?.message ||
          data?.errors?.[0]?.message ||
          data?.errors?.[0]?.errCode ||
          "TripJack hotel book failed",
        upstreamUrl: TRIPJACK_HOTEL_BOOK_URL,
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
      upstreamUrl: TRIPJACK_HOTEL_BOOK_URL,
      upstreamStatus: upstream.status,
      elapsedMs,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    console.error("[tripjack-proxy] Hotel book error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Hotel book proxy failed",
      upstreamUrl: TRIPJACK_HOTEL_BOOK_URL,
      elapsedMs: Date.now() - started,
    });
  }
});
