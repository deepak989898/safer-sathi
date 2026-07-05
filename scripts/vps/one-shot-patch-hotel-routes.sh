#!/usr/bin/env bash
# Run ON VPS: cd /var/www/tripjack-proxy && bash one-shot-patch-hotel-routes.sh
set -euo pipefail

cd /var/www/tripjack-proxy

echo "=== Backup server.js ==="
cp server.js "server.js.bak.$(date +%Y%m%d%H%M%S)"

python3 - <<'PY'
import pathlib
import re

path = pathlib.Path("server.js")
content = path.read_text(encoding="utf-8")

MARKER_START = "// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ==="
MARKER_END = "// === END TRIPJACK HOTEL V3 ROUTES ==="

snippet = r'''
// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ===

const TRIPJACK_HOTEL_HMS_BASE =
  process.env.TRIPJACK_HOTEL_HMS_BASE ||
  process.env.TRIPJACK_HOTEL_STATIC_BASE ||
  "https://apitest-hms.tripjack.com";

const TRIPJACK_HOTEL_FETCH_STATIC_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/fetch-static-hotels`;
const TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL =
  process.env.TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/fetch-static-hotels/deleted`;
const TRIPJACK_HOTEL_FETCH_MAPPING_URL =
  process.env.TRIPJACK_HOTEL_FETCH_MAPPING_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/content/fetch-hotel-mapping`;
const TRIPJACK_HOTEL_STATIC_DETAIL_URL =
  process.env.TRIPJACK_HOTEL_STATIC_DETAIL_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/hotel/static-detail`;
const TRIPJACK_HOTEL_NATIONALITIES_URL =
  process.env.TRIPJACK_HOTEL_NATIONALITIES_URL ||
  `${TRIPJACK_HOTEL_HMS_BASE}/hms/v3/nationality-info`;

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
      data = JSON.parse(text);
    } catch {
      return res.status(upstream.status || 502).json({
        success: false,
        error: `Invalid JSON from TripJack Hotel ${label} API`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || `TripJack hotel ${label} failed`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: data,
      });
    }
    return res.json({ success: true, data, upstreamUrl, upstreamStatus: upstream.status, elapsedMs });
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
      data = JSON.parse(text);
    } catch {
      return res.status(upstream.status || 502).json({
        success: false,
        error: `Invalid JSON from TripJack Hotel ${label} API`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: { raw: text.slice(0, 500) },
      });
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || `TripJack hotel ${label} failed`,
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        upstreamData: data,
      });
    }
    return res.json({ success: true, data, upstreamUrl, upstreamStatus: upstream.status, elapsedMs });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : `Hotel ${label} proxy failed`,
      upstreamUrl,
      elapsedMs: Date.now() - started,
    });
  }
}

app.post("/api/tripjack/hotels/fetch-static-hotels", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_STATIC_URL, req.body, "fetch-static-hotels")
);

app.post("/api/tripjack/hotels/fetch-static-hotels/deleted", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL, req.body, "fetch-static-hotels-deleted")
);

app.post("/api/tripjack/hotels/fetch-hotel-mapping", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_FETCH_MAPPING_URL, req.body, "fetch-hotel-mapping")
);

app.post("/api/tripjack/hotels/static-detail", (req, res) => {
  if (!req.body?.hotelId && !req.body?.tjHotelId && !req.body?.hid) {
    return res.status(400).json({ success: false, error: "hotelId is required" });
  }
  return forwardTripJackHotel(res, TRIPJACK_HOTEL_STATIC_DETAIL_URL, req.body, "static-detail");
});

app.post("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotel(res, TRIPJACK_HOTEL_NATIONALITIES_URL, req.body ?? {}, "nationalities")
);

app.get("/api/tripjack/hotels/nationalities", (req, res) =>
  forwardTripJackHotelGet(res, TRIPJACK_HOTEL_NATIONALITIES_URL, "nationalities")
);

// === END TRIPJACK HOTEL V3 ROUTES ===
'''.strip() + "\n"

# Remove misplaced hotel block (e.g. after app.listen)
while MARKER_START in content:
    s = content.find(MARKER_START)
    e = content.find(MARKER_END, s)
    if e == -1:
        break
    e += len(MARKER_END)
    content = content[:s] + content[e:]

# JSON body parse error handler (after express.json)
json_err_handler = '''
// Return JSON for malformed request bodies (not HTML stack traces)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ success: false, error: "Invalid JSON request body" });
  }
  next(err);
});
'''
if "Invalid JSON request body" not in content:
    m = re.search(r"(app\.use\(\s*express\.json\([^)]*\)\s*\)\s*;)", content)
    if m:
        insert_at = m.end()
        content = content[:insert_at] + "\n" + json_err_handler + content[insert_at:]
        print("Added JSON parse error middleware")
    else:
        print("WARN: express.json() not found — add JSON error middleware manually")

listen = re.search(r"\napp\.listen\(", content)
if not listen:
    raise SystemExit("ERROR: app.listen( not found in server.js")

insert_at = listen.start()
content = content[:insert_at] + "\n" + snippet + "\n" + content[insert_at:]
path.write_text(content, encoding="utf-8")
print("Injected hotel static routes BEFORE app.listen()")
PY

echo ""
echo "=== .env check (no API key printed) ==="
for v in TRIPJACK_HOTEL_FETCH_STATIC_URL TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL TRIPJACK_HOTEL_FETCH_MAPPING_URL TRIPJACK_HOTEL_STATIC_DETAIL_URL TRIPJACK_HOTEL_NATIONALITIES_URL; do
  grep -q "^${v}=" .env && echo "OK $v" || echo "MISSING $v"
done

echo ""
echo "=== Restart PM2 ==="
pm2 restart tripjack-proxy --update-env
pm2 save
sleep 2

echo ""
echo "=== Verify fetch-static-hotels ==="
curl -s -X POST http://127.0.0.1:4000/api/tripjack/hotels/fetch-static-hotels \
  -H "Content-Type: application/json" -d '{}' | head -c 400
echo ""
