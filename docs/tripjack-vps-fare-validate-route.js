/**
 * REPLACE only the fare-validate block in /var/www/tripjack-proxy/server.js
 *
 * Proxy route (unchanged):
 *   POST /api/tripjack/flights/fare-validate
 *
 * Sample payloads (FARE VALIDATE V2 INSTANT SAMPLE PAYLOADS.zip) contain
 * request/response JSON only — no URL path.
 *
 * Phase 3 prompt listed POST /fms/v1/fare-validate, but TripJack UAT returns 404
 * for that path. This route tries documented candidate paths only (in order),
 * logs every attempt, and uses the first non-404 upstream response.
 *
 * Candidates (docs / prompt list only — no silent inventing):
 *   1. /fms/v1/air/fare-validate
 *   2. /oms/v1/air/fare-validate
 *   3. /fms/v1/fare-validate-v2
 *   4. /fms/v1/air/fare-validate-v2
 *   5. /fms/v1/air/fare-validate-instant
 *   6. /fms/v1/fare-validate          (original; known 404 on UAT)
 *
 * Override single URL (skips candidate loop):
 *   TRIPJACK_FARE_VALIDATE_URL=https://apitest.tripjack.com/<path>
 *
 * After save:
 *   pm2 restart tripjack-proxy
 *   pm2 logs tripjack-proxy --lines 40
 */

const TRIPJACK_BASE = (process.env.TRIPJACK_BASE_URL || "https://apitest.tripjack.com").replace(
  /\/$/,
  ""
);

/** Ordered candidates from docs/prompt only. */
const FARE_VALIDATE_PATH_CANDIDATES = [
  "/fms/v1/air/fare-validate",
  "/oms/v1/air/fare-validate",
  "/fms/v1/fare-validate-v2",
  "/fms/v1/air/fare-validate-v2",
  "/fms/v1/air/fare-validate-instant",
  "/fms/v1/fare-validate",
];

function fareValidateCandidateUrls() {
  if (process.env.TRIPJACK_FARE_VALIDATE_URL) {
    return [process.env.TRIPJACK_FARE_VALIDATE_URL];
  }
  return FARE_VALIDATE_PATH_CANDIDATES.map((path) => `${TRIPJACK_BASE}${path}`);
}

async function postTripJackFareValidate(targetUrl, requestBody) {
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

  return { upstream, data, text };
}

app.post("/api/tripjack/flights/fare-validate", async (req, res) => {
  const requestBody = req.body;
  const candidates = fareValidateCandidateUrls();

  console.log("[tripjack-proxy] POST /api/tripjack/flights/fare-validate");
  console.log("[tripjack-proxy] Fare-validate candidates:", candidates);
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

  const attempts = [];

  try {
    for (const targetUrl of candidates) {
      console.log("[tripjack-proxy] Fare-validate trying endpoint:", targetUrl);

      const { upstream, data } = await postTripJackFareValidate(targetUrl, requestBody);

      console.log(
        "[tripjack-proxy] Fare-validate upstream status:",
        upstream.status,
        "url:",
        targetUrl
      );

      attempts.push({
        upstreamUrl: targetUrl,
        upstreamStatus: upstream.status,
      });

      // Path does not exist on TripJack — try next documented candidate.
      if (upstream.status === 404) {
        console.log("[tripjack-proxy] Fare-validate 404, trying next candidate");
        continue;
      }

      console.log("[tripjack-proxy] Fare-validate USING endpoint:", targetUrl);

      if (!upstream.ok) {
        return res.status(upstream.status).json({
          success: false,
          error:
            data?.message ||
            data?.errors?.[0]?.message ||
            "TripJack fare validate failed",
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
    console.error(
      "[tripjack-proxy] Fare-validate: all documented candidates returned 404",
      attempts
    );

    return res.status(404).json({
      success: false,
      error:
        "TripJack Fare Validate V2 Instant path not found (all documented candidates returned 404). Set TRIPJACK_FARE_VALIDATE_URL to the exact docs URL.",
      upstreamUrl: last?.upstreamUrl || candidates[candidates.length - 1],
      upstreamStatus: 404,
      upstreamData: {
        message: "All candidate endpoints returned HTTP 404",
        candidates,
      },
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
