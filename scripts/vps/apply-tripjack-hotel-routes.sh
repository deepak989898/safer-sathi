#!/usr/bin/env bash
# Run on VPS from repo: bash scripts/vps/apply-tripjack-hotel-routes.sh
# Or: cd /var/www/tripjack-proxy && bash /path/to/apply-tripjack-hotel-routes.sh

set -euo pipefail

PROXY_DIR="/var/www/tripjack-proxy"
MARKER="// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNIPPET_FILE="${SCRIPT_DIR}/tripjack-hotel-routes.snippet.js"

cd "$PROXY_DIR"

echo "=== Audit: $PROXY_DIR ==="
ls -la

echo ""
echo "=== package.json ==="
cat package.json

echo ""
echo "=== .env TripJack vars (API key redacted) ==="
grep '^TRIPJACK' .env 2>/dev/null | grep -v '^TRIPJACK_API_KEY=' || true
if grep -q '^TRIPJACK_API_KEY=' .env 2>/dev/null; then
  key_preview=$(grep '^TRIPJACK_API_KEY=' .env | cut -d= -f2 | head -c 4)
  echo "TRIPJACK_API_KEY=${key_preview}... (set)"
else
  echo "WARNING: TRIPJACK_API_KEY not found in .env"
fi

echo ""
echo "=== server.js routes ==="
echo -n "flight routes: "
grep -c 'tripjack/flights' server.js || echo 0
echo -n "hotel routes: "
grep -c 'tripjack/hotels' server.js || echo 0
grep -n 'app\.\(get\|post\)(' server.js | head -40 || true

if [[ ! -f "$SNIPPET_FILE" ]]; then
  echo "ERROR: snippet not found at $SNIPPET_FILE"
  exit 1
fi

if grep -q "$MARKER" server.js; then
  echo ""
  echo "Hotel routes marker already present — skipping inject."
else
  echo ""
  echo "=== Backing up server.js ==="
  cp server.js "server.js.bak.$(date +%Y%m%d%H%M%S)"

  echo "=== Injecting hotel routes before app.listen ==="
  SNIPPET_FILE="$SNIPPET_FILE" python3 - <<'PY'
import os
import pathlib
import re

marker = "// === TRIPJACK HOTEL V3 ROUTES (safar-sathi) ==="
snippet_path = pathlib.Path(os.environ["SNIPPET_FILE"])
server_path = pathlib.Path("server.js")

snippet = snippet_path.read_text(encoding="utf-8")
server = server_path.read_text(encoding="utf-8")

if marker in server:
    print("Already patched")
    raise SystemExit(0)

listen_match = re.search(r"\napp\.listen\(", server)
if not listen_match:
    raise SystemExit("ERROR: app.listen( not found — paste snippet manually before listen")

insert_at = listen_match.start()
patched = server[:insert_at] + "\n" + snippet + "\n" + server[insert_at:]
server_path.write_text(patched, encoding="utf-8")
print("Injected hotel routes OK")
PY
fi

echo ""
echo "=== .env variable check ==="
required=(
  TRIPJACK_HOTEL_STATIC_BASE
  TRIPJACK_HOTEL_FETCH_STATIC_URL
  TRIPJACK_HOTEL_FETCH_STATIC_DELETED_URL
  TRIPJACK_HOTEL_FETCH_MAPPING_URL
  TRIPJACK_HOTEL_STATIC_DETAIL_URL
  TRIPJACK_HOTEL_NATIONALITIES_URL
)
for v in "${required[@]}"; do
  if grep -q "^${v}=" .env 2>/dev/null; then
    echo "OK  $v"
  else
    echo "MISSING $v"
  fi
done

echo ""
echo "=== Restarting PM2 ==="
pm2 restart tripjack-proxy --update-env
pm2 save
sleep 2

echo ""
echo "=== Route probe (after restart) ==="
probe() {
  local method="$1" path="$2" body="${3:-{}}"
  code=$(curl -s -o /tmp/tjprobe.json -w "%{http_code}" -X "$method" "http://127.0.0.1:4000${path}" \
    -H "Content-Type: application/json" -d "$body")
  echo "$method $path -> HTTP $code"
  head -c 150 /tmp/tjprobe.json 2>/dev/null; echo ""
}

probe GET /health
probe GET /api/tripjack/hotels/nationalities
probe POST /api/tripjack/hotels/fetch-static-hotels '{}'
probe POST /api/tripjack/flights/search '{}'

echo ""
echo "=== PM2 status ==="
pm2 list | head -10

echo ""
echo "Done. View logs: pm2 logs tripjack-proxy --lines 50"
