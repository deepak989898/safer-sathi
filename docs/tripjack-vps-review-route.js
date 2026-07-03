/**
 * Paste this block into /var/www/tripjack-proxy/server.js
 * (alongside the existing /api/tripjack/flights/search route).
 *
 * TripJack Review endpoint: POST https://apitest.tripjack.com/fms/v1/review
 *
 * After saving:
 *   pm2 restart tripjack-proxy
 *   pm2 logs tripjack-proxy --lines 30
 */

// --- TRIPJACK FLIGHT REVIEW (add near search route) ---
const TRIPJACK_REVIEW_URL =
  process.env.TRIPJACK_REVIEW_URL || "https://apitest.tripjack.com/fms/v1/review";

app.post("/api/tripjack/flights/review", async (req, res) => {
  const requestBody = req.body;
  console.log("[tripjack-proxy] POST /api/tripjack/flights/review");
  console.log("[tripjack-proxy] Forwarding to:", TRIPJACK_REVIEW_URL);
  console.log("[tripjack-proxy] Request body:", JSON.stringify(requestBody));

  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "TRIPJACK_API_KEY is not set on VPS",
    });
  }

  if (!requestBody?.priceIds || !Array.isArray(requestBody.priceIds) || !requestBody.priceIds.length) {
    return res.status(400).json({
      success: false,
      error: "priceIds array is required",
    });
  }

  try {
    const upstream = await fetch(TRIPJACK_REVIEW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify({ priceIds: requestBody.priceIds }),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log("[tripjack-proxy] Review upstream status:", upstream.status);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || "TripJack review failed",
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
    console.error("[tripjack-proxy] Review error:", err);
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Proxy review request failed",
    });
  }
});
