// Shared TripJack hotel forward helpers — paste into server.js (safar-sathi)

function tripJackUpstreamErrorMessage(status, label, text) {
  const preview = (text || "").trim();
  if (!preview) {
    return `TripJack upstream returned ${status} with empty body for ${label}. VPS proxy route is OK — verify API key, HMS hotel API access, and IP whitelist with TripJack support.`;
  }
  return `TripJack upstream returned ${status} with non-JSON body for ${label}`;
}

function parseTripJackUpstreamBody(text, upstreamStatus, label, upstreamUrl, elapsedMs) {
  const raw = text ?? "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      response: {
        success: false,
        error: tripJackUpstreamErrorMessage(upstreamStatus, label, raw),
        upstreamUrl,
        upstreamStatus,
        elapsedMs,
        proxyRouteOk: true,
        upstreamData: { raw: "" },
      },
    };
  }
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      response: {
        success: false,
        error: tripJackUpstreamErrorMessage(upstreamStatus, label, raw),
        upstreamUrl,
        upstreamStatus,
        elapsedMs,
        proxyRouteOk: true,
        upstreamData: { raw: raw.slice(0, 500) },
      },
    };
  }
}

function logHotelHmsUrlsOnStartup() {
  const base =
    process.env.TRIPJACK_HOTEL_HMS_BASE ||
    process.env.TRIPJACK_HOTEL_STATIC_BASE ||
    "https://apitest-hms.tripjack.com";
  console.log("[tripjack-proxy] Hotel HMS URL config:", {
    TRIPJACK_HOTEL_HMS_BASE: process.env.TRIPJACK_HOTEL_HMS_BASE || base,
    TRIPJACK_HOTEL_FETCH_MAPPING_URL:
      process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
      `${base}/hms/v3/content/fetch-hotel-mapping`,
    TRIPJACK_HOTEL_FETCH_CONTENT_URL:
      process.env.TRIPJACK_HOTEL_FETCH_CONTENT_URL ||
      `${base}/hms/v3/content/fetch-hotel-content`,
    TRIPJACK_HOTEL_NATIONALITIES_URL:
      process.env.TRIPJACK_HOTEL_NATIONALITIES_URL ||
      `${base}/hms/v3/nationality-info`,
  });
}
