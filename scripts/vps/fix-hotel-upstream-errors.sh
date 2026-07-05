#!/usr/bin/env bash
# Run ON VPS: cd /var/www/tripjack-proxy && bash fix-hotel-upstream-errors.sh
# Fixes: duplicate .env URLs, improves 403/empty-body errors, logs hotel URLs at startup.
set -euo pipefail

cd /var/www/tripjack-proxy

echo "=== Backup .env and server.js ==="
cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
cp server.js "server.js.bak.$(date +%Y%m%d%H%M%S)"

echo "=== Clean .env (staging apitest only, no duplicates, API key untouched) ==="
python3 - <<'PY'
import pathlib
import re
from collections import defaultdict

path = pathlib.Path(".env")
lines = path.read_text(encoding="utf-8").splitlines()

comments_and_blanks = []
vars_by_key = defaultdict(list)

for i, line in enumerate(lines):
    s = line.strip()
    if not s or s.startswith("#"):
        comments_and_blanks.append((i, line))
        continue
    if "=" not in line:
        comments_and_blanks.append((i, line))
        continue
    key, val = line.split("=", 1)
    key = key.strip()
    val = val.strip()
    vars_by_key[key].append(val)

def pick_hotel_value(key, values):
    apitest = [v for v in values if "apitest-hms" in v or "apitest.tripjack" in v]
    if apitest:
        return apitest[-1]
    non_prod = [v for v in values if "hms.tripjack.com" not in v or "apitest" in v]
    if non_prod:
        return non_prod[-1]
    return values[-1]

def pick_default(key, values):
    if len(values) == 1:
        return values[0]
    return values[-1]

out_lines = []
# preserve header comments from top
for _, line in comments_and_blanks:
    if line.strip().startswith("#") or not line.strip():
        out_lines.append(line)

written = set()
order = [
    "PORT",
    "TRIPJACK_BASE_URL",
    "TRIPJACK_USER_ID",
    "TRIPJACK_API_KEY",
    "TRIPJACK_HOTEL_STATIC_BASE",
    "TRIPJACK_HOTEL_FETCH_STATIC_URL",
    "TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL",
    "TRIPJACK_HOTEL_FETCH_MAPPING_URL",
    "TRIPJACK_HOTEL_STATIC_DETAIL_URL",
    "TRIPJACK_HOTEL_NATIONALITIES_URL",
    "TRIPJACK_HOTEL_LISTING_URL",
    "TRIPJACK_HOTEL_DETAIL_URL",
    "TRIPJACK_HOTEL_PRICING_URL",
    "TRIPJACK_HOTEL_REVIEW_URL",
    "TRIPJACK_HOTEL_BOOK_URL",
    "TRIPJACK_HOTEL_BOOKING_DETAILS_URL",
    "TRIPJACK_HOTEL_CANCEL_BOOKING_URL",
]

for key in order:
    if key not in vars_by_key:
        continue
    vals = vars_by_key[key]
    if key == "TRIPJACK_API_KEY":
        out_lines.append(f"{key}={vals[-1]}")
    elif key.startswith("TRIPJACK_HOTEL"):
        out_lines.append(f"{key}={pick_hotel_value(key, vals)}")
    else:
        out_lines.append(f"{key}={pick_default(key, vals)}")
    written.add(key)

for key, vals in sorted(vars_by_key.items()):
    if key in written:
        continue
    if key == "TRIPJACK_API_KEY":
        continue
    if key.startswith("TRIPJACK_HOTEL"):
        out_lines.append(f"{key}={pick_hotel_value(key, vals)}")
    else:
        out_lines.append(f"{key}={pick_default(key, vals)}")

path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
print("Cleaned .env — duplicates removed, staging apitest preferred")
PY

echo ""
echo "=== Hotel env (API key redacted) ==="
grep '^TRIPJACK_HOTEL' .env || true
if grep -q '^TRIPJACK_API_KEY=' .env; then
  p=$(grep '^TRIPJACK_API_KEY=' .env | cut -d= -f2 | head -c 4)
  echo "TRIPJACK_API_KEY=${p}... (set)"
fi

echo ""
echo "=== Patch server.js hotel forwarders ==="
python3 - <<'PY'
import pathlib
import re

path = pathlib.Path("server.js")
content = path.read_text(encoding="utf-8")

MARKER_START = "// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ==="
MARKER_END = "// === END TRIPJACK HOTEL V3 ROUTES ==="

snippet = pathlib.Path(__file__).resolve().parent / "tripjack-hotel-routes-v2.snippet.js"
# when run from /var/www/tripjack-proxy, snippet is in /tmp — embed inline below

SNIPPET = r'''
// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ===

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

console.log("[tripjack-proxy] Hotel HMS URL config:", {
  TRIPJACK_HOTEL_STATIC_BASE: process.env.TRIPJACK_HOTEL_STATIC_BASE || TRIPJACK_HOTEL_HMS_BASE,
  TRIPJACK_HOTEL_FETCH_STATIC_URL,
  TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL,
  TRIPJACK_HOTEL_FETCH_MAPPING_URL,
  TRIPJACK_HOTEL_STATIC_DETAIL_URL,
  TRIPJACK_HOTEL_NATIONALITIES_URL,
});

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
    const parsed = parseTripJackUpstreamBody(text, upstream.status, label, upstreamUrl, elapsedMs);
    if (!parsed.ok) {
      console.log(`[tripjack-proxy] Hotel ${label} GET upstream:`, upstream.status, "empty/non-json");
      return res.status(parsed.response.upstreamStatus || 502).json(parsed.response);
    }
    const data = parsed.data;
    console.log(`[tripjack-proxy] Hotel ${label} GET upstream:`, upstream.status, "ms:", elapsedMs);
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || tripJackUpstreamErrorMessage(upstream.status, label, text),
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        proxyRouteOk: true,
        upstreamData: data,
      });
    }
    return res.json({ success: true, data, upstreamUrl, upstreamStatus: upstream.status, elapsedMs, proxyRouteOk: true });
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
    const parsed = parseTripJackUpstreamBody(text, upstream.status, label, upstreamUrl, elapsedMs);
    if (!parsed.ok) {
      console.log(`[tripjack-proxy] Hotel ${label} POST upstream:`, upstream.status, "empty/non-json");
      return res.status(parsed.response.upstreamStatus || 502).json(parsed.response);
    }
    const data = parsed.data;
    console.log(`[tripjack-proxy] Hotel ${label} POST upstream:`, upstream.status, "ms:", elapsedMs);
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data?.message || data?.errors?.[0]?.message || tripJackUpstreamErrorMessage(upstream.status, label, text),
        upstreamUrl,
        upstreamStatus: upstream.status,
        elapsedMs,
        proxyRouteOk: true,
        upstreamData: data,
      });
    }
    return res.json({ success: true, data, upstreamUrl, upstreamStatus: upstream.status, elapsedMs, proxyRouteOk: true });
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

# Remove old hotel block anywhere
while MARKER_START in content:
    s = content.find(MARKER_START)
    e = content.find(MARKER_END, s)
    if e == -1:
        break
    e += len(MARKER_END)
    content = content[:s] + content[e:]

listen = re.search(r"\napp\.listen\(", content)
if not listen:
    raise SystemExit("ERROR: app.listen( not found")

insert_at = listen.start()
content = content[:insert_at] + "\n" + SNIPPET + "\n" + content[insert_at:]
path.write_text(content, encoding="utf-8")
print("Patched server.js with improved hotel forwarders")
PY

echo ""
echo "=== Restart PM2 ==="
pm2 restart tripjack-proxy --update-env
pm2 save
sleep 2

echo ""
echo "=== Test fetch-static-hotels ==="
curl -s -X POST http://127.0.0.1:4000/api/tripjack/hotels/fetch-static-hotels \
  -H "Content-Type: application/json" -d '{}'
echo ""

echo ""
echo "=== Test nationalities GET ==="
curl -s http://127.0.0.1:4000/api/tripjack/hotels/nationalities | head -c 500
echo ""

echo ""
echo "If upstreamStatus is 403 with proxyRouteOk:true, VPS route works — contact TripJack for HMS API access/IP whitelist."
