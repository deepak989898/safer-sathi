/**
 * Safar Sathi — complete TripJack proxy (hotels + flights)
 * Fresh DigitalOcean install (no old VPS needed)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Safar Sathi TripJack Proxy",
    hint: "Use /health and /api/tripjack/hotels/*",
  });
});

app.get("/health", (_req, res) => {
  const base = process.env.TRIPJACK_HOTEL_HMS_BASE || "";
  res.json({
    ok: true,
    service: "Safar Sathi TripJack Proxy",
    hasApiKey: Boolean(process.env.TRIPJACK_API_KEY),
    env: base.includes("apitest") ? "staging" : "production",
  });
});

// ---------------- Flights ----------------
const TRIPJACK_SEARCH_URL =
  process.env.TRIPJACK_SEARCH_URL || "https://apitest.tripjack.com/fms/v1/air-search-all";
const TRIPJACK_REVIEW_URL =
  process.env.TRIPJACK_REVIEW_URL || "https://apitest.tripjack.com/fms/v1/review";
const TRIPJACK_BOOK_URL =
  process.env.TRIPJACK_BOOK_URL || "https://apitest.tripjack.com/oms/v1/air/book";
const TRIPJACK_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_BOOKING_DETAILS_URL ||
  "https://apitest.tripjack.com/oms/v1/air/booking-details";
const TRIPJACK_CONFIRM_FARE_URL =
  process.env.TRIPJACK_CONFIRM_FARE_URL ||
  "https://apitest.tripjack.com/oms/v1/air/confirm-fare-before-ticket";
const TRIPJACK_GET_CHARGES_URL =
  process.env.TRIPJACK_GET_CHARGES_URL ||
  "https://apitest.tripjack.com/oms/v1/air/get-charges";
const TRIPJACK_SUBMIT_AMENDMENT_URL =
  process.env.TRIPJACK_SUBMIT_AMENDMENT_URL ||
  "https://apitest.tripjack.com/oms/v1/air/submit-amendment";
const TRIPJACK_POLL_AMENDMENT_URL =
  process.env.TRIPJACK_POLL_AMENDMENT_URL ||
  "https://apitest.tripjack.com/oms/v1/air/poll-amendment";
const TRIPJACK_RELEASE_PNR_URL =
  process.env.TRIPJACK_RELEASE_PNR_URL ||
  "https://apitest.tripjack.com/oms/v1/air/unhold";

async function forwardTripJack(res, targetUrl, requestBody, label) {
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
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `${label} proxy failed`,
    });
  }
}

app.post("/api/tripjack/flights/search", async (req, res) => {
  if (!req.body?.searchQuery) {
    return res.status(400).json({ success: false, error: "searchQuery is required" });
  }
  return forwardTripJack(res, TRIPJACK_SEARCH_URL, req.body, "search");
});

app.post("/api/tripjack/flights/review", async (req, res) => {
  if (!req.body?.priceIds?.length) {
    return res.status(400).json({ success: false, error: "priceIds array is required" });
  }
  return forwardTripJack(res, TRIPJACK_REVIEW_URL, { priceIds: req.body.priceIds }, "review");
});

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

app.post("/api/tripjack/flights/get-charges", async (req, res) =>
  forwardTripJack(res, TRIPJACK_GET_CHARGES_URL, req.body, "get-charges")
);
app.post("/api/tripjack/flights/submit-amendment", async (req, res) =>
  forwardTripJack(res, TRIPJACK_SUBMIT_AMENDMENT_URL, req.body, "submit-amendment")
);
app.post("/api/tripjack/flights/poll-amendment", async (req, res) =>
  forwardTripJack(res, TRIPJACK_POLL_AMENDMENT_URL, req.body, "poll-amendment")
);
app.post("/api/tripjack/flights/release-pnr", async (req, res) =>
  forwardTripJack(res, TRIPJACK_RELEASE_PNR_URL, req.body, "release-pnr")
);

// ---------------- Hotels ----------------
const TRIPJACK_HOTEL_HMS_BASE =
  process.env.TRIPJACK_HOTEL_HMS_BASE ||
  process.env.TRIPJACK_HOTEL_STATIC_BASE ||
  "https://apitest-hms.tripjack.com";

const TRIPJACK_HOTEL_LISTING_URL =
  process.env.TRIPJACK_HOTEL_LISTING_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/listing`;
const TRIPJACK_HOTEL_DETAIL_URL =
  process.env.TRIPJACK_HOTEL_DETAIL_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/detail`;
const TRIPJACK_HOTEL_PRICING_URL =
  process.env.TRIPJACK_HOTEL_PRICING_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/pricing`;
const TRIPJACK_HOTEL_REVIEW_URL =
  process.env.TRIPJACK_HOTEL_REVIEW_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/review`;
const TRIPJACK_HOTEL_BOOK_URL =
  process.env.TRIPJACK_HOTEL_BOOK_URL || `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/book`;
const TRIPJACK_HOTEL_BOOKING_DETAILS_URL =
  process.env.TRIPJACK_HOTEL_BOOKING_DETAILS_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/booking-details`;
const TRIPJACK_HOTEL_CANCEL_BOOKING_URL =
  process.env.TRIPJACK_HOTEL_CANCEL_BOOKING_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/cancel-booking`;
const TRIPJACK_HOTEL_FETCH_MAPPING_URL =
  process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/content/fetch-hotel-mapping`;
const TRIPJACK_HOTEL_FETCH_CONTENT_URL =
  process.env.TRIPJACK_HOTEL_FETCH_CONTENT_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/content/fetch-hotel-content`;
const TRIPJACK_HOTEL_NATIONALITIES_URL =
  process.env.TRIPJACK_HOTEL_NATIONALITIES_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/nationality-info`;

function formatUpstreamNonJsonError(upstream, text, upstreamUrl, label) {
  const trimmed = (text || "").trim();
  const isEmpty = !trimmed;
  if (upstream.status === 403) {
    return {
      httpStatus: 403,
      body: {
        success: false,
        proxyRouteOk: true,
        error:
          "TripJack upstream returned 403. Verify HMS API access, API key permission and IP whitelist.",
        upstreamStatus: upstream.status,
        upstreamUrl,
        upstreamData: { raw: trimmed.slice(0, 500) },
      },
    };
  }
  return {
    httpStatus: upstream.status || 502,
    body: {
      success: false,
      proxyRouteOk: true,
      error: isEmpty
        ? `TripJack hotel ${label} returned empty response (HTTP ${upstream.status})`
        : `TripJack hotel ${label} returned non-JSON response`,
      upstreamStatus: upstream.status,
      upstreamUrl,
      upstreamData: { raw: trimmed.slice(0, 500) },
    },
  };
}

async function forwardTripJackHotelGet(res, upstreamUrl, label) {
  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }
  const started = Date.now();
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json", apikey: process.env.TRIPJACK_API_KEY },
    });
    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    let data;
    try {
      data = text.trim() ? JSON.parse(text) : null;
    } catch {
      const formatted = formatUpstreamNonJsonError(upstream, text, upstreamUrl, label);
      return res.status(formatted.httpStatus).json({ ...formatted.body, elapsedMs });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || `TripJack hotel ${label} failed`,
        upstreamUrl,
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
      upstreamUrl,
      upstreamStatus: upstream.status,
      elapsedMs,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `Hotel ${label} proxy failed`,
      upstreamUrl,
      elapsedMs: Date.now() - started,
    });
  }
}

async function forwardTripJackHotel(res, upstreamUrl, requestBody, label) {
  if (!process.env.TRIPJACK_API_KEY) {
    return res.status(500).json({ success: false, error: "TRIPJACK_API_KEY is not set on VPS" });
  }
  const started = Date.now();
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: process.env.TRIPJACK_API_KEY,
      },
      body: JSON.stringify(requestBody ?? {}),
    });
    const text = await upstream.text();
    const elapsedMs = Date.now() - started;
    let data;
    try {
      data = text.trim() ? JSON.parse(text) : null;
    } catch {
      const formatted = formatUpstreamNonJsonError(upstream, text, upstreamUrl, label);
      return res.status(formatted.httpStatus).json({ ...formatted.body, elapsedMs });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || `TripJack hotel ${label} failed`,
        upstreamUrl,
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
      upstreamUrl,
      upstreamStatus: upstream.status,
      elapsedMs,
      status: { success: true, httpStatus: upstream.status },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `Hotel ${label} proxy failed`,
      upstreamUrl,
      elapsedMs: Date.now() - started,
    });
  }
}

app.post("/api/tripjack/hotels/listing", async (req, res) => {
  if (!req.body?.checkIn || !req.body?.checkOut) {
    return res.status(400).json({ success: false, error: "checkIn and checkOut are required" });
  }
  if (!req.body?.rooms?.length) {
    return res.status(400).json({ success: false, error: "rooms array is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_LISTING_URL, req.body, "listing");
});

app.post("/api/tripjack/hotels/detail", async (req, res) => {
  if (!req.body?.correlationId) {
    return res.status(400).json({ success: false, error: "correlationId is required" });
  }
  if (req.body?.hotelId === undefined || req.body?.hotelId === null || req.body?.hotelId === "") {
    return res.status(400).json({ success: false, error: "hotelId is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_DETAIL_URL, req.body, "detail");
});

app.post("/api/tripjack/hotels/pricing", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_PRICING_URL, req.body, "pricing")
);
app.post("/api/tripjack/hotels/review", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_REVIEW_URL, req.body, "review")
);
app.post("/api/tripjack/hotels/book", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_BOOK_URL, req.body, "book")
);
app.post("/api/tripjack/hotels/booking-details", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_BOOKING_DETAILS_URL, req.body, "booking-details")
);
app.post("/api/tripjack/hotels/cancel-booking", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_CANCEL_BOOKING_URL, req.body, "cancel-booking")
);
app.post("/api/tripjack/hotels/fetch-hotel-mapping", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_MAPPING_URL, req.body, "fetch-hotel-mapping")
);
app.post("/api/tripjack/hotels/fetch-hotel-content", (req, res) => {
  const hotelIds = req.body?.hotelIds;
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
    return res.status(400).json({ success: false, error: "hotelIds array is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_CONTENT_URL, req.body, "fetch-hotel-content");
});
app.post("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_NATIONALITIES_URL, req.body ?? {}, "nationalities")
);
app.get("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotelGet(res, TRIPJACK_HOTEL_NATIONALITIES_URL, "nationalities")
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[tripjack-proxy] listening on 0.0.0.0:${PORT}`);
  console.log(`[tripjack-proxy] API key set:`, Boolean(process.env.TRIPJACK_API_KEY));
  console.log(`[tripjack-proxy] Hotel HMS:`, TRIPJACK_HOTEL_HMS_BASE);
});
