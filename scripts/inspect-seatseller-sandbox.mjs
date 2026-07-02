/**
 * Dump live SeatSeller sandbox response shapes for parser development.
 * Usage: node scripts/inspect-seatseller-sandbox.mjs [source] [destination] [doj]
 * Defaults: source=3 (Bangalore), destination=6 (Hyderabad), doj=2026-07-03
 */
import { readFileSync } from "fs";
import { createHmac, randomBytes } from "crypto";

const envPath = new URL("../.env.local", import.meta.url);
try {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
} catch {
  console.warn("No .env.local found — using process.env");
}

const consumerKey = process.env.SEATSELLER_CONSUMER_KEY;
const consumerSecret = process.env.SEATSELLER_CONSUMER_SECRET;
const baseUrl = (process.env.SEATSELLER_BASE_URL ?? "http://api.seatseller.travel").replace(/\/$/, "");

const source = process.argv[2] ?? "3";
const destination = process.argv[3] ?? "6";
const doj = process.argv[4] ?? "2026-07-03";

if (!consumerKey || !consumerSecret) {
  console.error("Set SEATSELLER_CONSUMER_KEY and SEATSELLER_CONSUMER_SECRET in .env.local");
  process.exit(1);
}

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOAuthHeader(method, url) {
  const parsed = new URL(url);
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  };

  const params = { ...Object.fromEntries(parsed.searchParams), ...oauth };
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(`${parsed.origin}${parsed.pathname}`), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams = { ...oauth, oauth_signature: signature };
  const auth = Object.keys(headerParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
    .join(", ");

  return `OAuth ${auth}`;
}

function describePayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { topLevelKeys: [], arrayKeys: [], nestedPaths: [] };
  }
  const record = raw;
  const topLevelKeys = Object.keys(record);
  const arrayKeys = topLevelKeys.filter((k) => Array.isArray(record[k]));
  const nestedPaths = [];
  for (const key of topLevelKeys) {
    const value = record[key];
    if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
      nestedPaths.push(`${key}[0]: ${Object.keys(value[0]).join(", ")}`);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      nestedPaths.push(`${key}: ${Object.keys(value).join(", ")}`);
    }
  }
  return { topLevelKeys, arrayKeys, nestedPaths };
}

async function seatsellerGet(path, query) {
  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: buildOAuthHeader("GET", url.toString()) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

console.log(`\nSeatSeller sandbox inspect — ${baseUrl}`);
console.log(`Route: ${source} → ${destination}, doj=${doj}\n`);

const tripsRes = await seatsellerGet("/availabletrips", { source, destination, doj });
console.log("=== availabletrips ===");
console.log("status:", tripsRes.status);
console.log("shape:", JSON.stringify(describePayload(tripsRes.data), null, 2));

const trips =
  tripsRes.data?.availableTrips ??
  tripsRes.data?.availabletrips ??
  tripsRes.data?.trips ??
  (Array.isArray(tripsRes.data) ? tripsRes.data : []);

const firstTrip = Array.isArray(trips) ? trips[0] : null;
if (firstTrip?.id) {
  console.log("\nFirst trip keys:", Object.keys(firstTrip).join(", "));
  console.log("First trip id:", firstTrip.id);

  const tripId = String(firstTrip.id);
  const detailsRes = await seatsellerGet("/tripdetails", { id: tripId });
  console.log("\n=== tripdetails ===");
  console.log("status:", detailsRes.status);
  console.log("shape:", JSON.stringify(describePayload(detailsRes.data), null, 2));

  const bpdpRes = await seatsellerGet("/bpdpdetails", { id: tripId });
  console.log("\n=== bpdpdetails ===");
  console.log("status:", bpdpRes.status);
  console.log("shape:", JSON.stringify(describePayload(bpdpRes.data), null, 2));
} else {
  console.log("\nNo trips found — skipping tripdetails/bpdpdetails");
}

console.log("\nDone.\n");
