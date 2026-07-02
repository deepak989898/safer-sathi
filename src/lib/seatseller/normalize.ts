/**
 * SeatSeller response normalization — sandbox/live agnostic.
 *
 * RULE: Never assume PDF field names. Always unwrap + probe the actual payload.
 * Sandbox and live differ only by SEATSELLER_* env vars; this module is shared.
 */

export interface PayloadShape {
  topLevelKeys: string[];
  arrayKeys: string[];
  nestedPaths: string[];
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function pickString(
  record: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback = ""
): string {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  const lowerMap = new Map(
    Object.entries(record).map(([k, v]) => [k.toLowerCase(), v] as const)
  );
  for (const key of keys) {
    const value = lowerMap.get(key.toLowerCase());
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
}

export function pickNumber(
  record: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback?: number
): number | undefined {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  const lowerMap = new Map(
    Object.entries(record).map(([k, v]) => [k.toLowerCase(), v] as const)
  );
  for (const key of keys) {
    const value = lowerMap.get(key.toLowerCase());
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

export function pickBoolean(
  record: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean | undefined {
  if (!record) return undefined;

  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") return value;
    const v = String(value).toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }

  return undefined;
}

export function pickArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value) && value.length) return value;
  }

  const entries = Object.entries(record);
  for (const key of keys) {
    const match = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (match && Array.isArray(match[1]) && match[1].length) return match[1];
  }

  return [];
}

export function keysMatching(record: Record<string, unknown>, patterns: string[]): string[] {
  return Object.keys(record).filter((key) => {
    const lower = key.toLowerCase();
    return patterns.some((p) => lower.includes(p.toLowerCase()));
  });
}

export function collectArraysByKeyPattern(
  record: Record<string, unknown>,
  patterns: string[]
): unknown[] {
  const collected: unknown[] = [];
  for (const key of keysMatching(record, patterns)) {
    const value = record[key];
    if (Array.isArray(value)) collected.push(...value);
  }
  return collected;
}

const WRAPPER_KEYS = [
  "data",
  "result",
  "response",
  "tripdetails",
  "tripDetails",
  "tripdetail",
  "bpdpdetails",
  "bpDpDetails",
  "availableTrips",
  "availabletrips",
  "trips",
];

export function unwrapSeatSellerPayload(raw: unknown, depth = 0): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record || depth > 6) return record;

  if (Array.isArray(raw) && raw[0]) {
    return unwrapSeatSellerPayload(raw[0], depth + 1);
  }

  for (const key of WRAPPER_KEYS) {
    const nested = record[key];
    if (Array.isArray(nested) && nested[0]) {
      const inner = unwrapSeatSellerPayload(nested[0], depth + 1);
      if (inner) return inner;
    }
    const nestedRecord = asRecord(nested);
    if (nestedRecord && Object.keys(nestedRecord).length) {
      const inner = unwrapSeatSellerPayload(nestedRecord, depth + 1);
      if (inner && hasMeaningfulFields(inner)) return inner;
    }
  }

  return record;
}

function hasMeaningfulFields(record: Record<string, unknown>): boolean {
  return Object.keys(record).some((k) => {
    const v = record[k];
    return v !== null && v !== undefined && v !== "";
  });
}

export function extractTripList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;

  const record = asRecord(raw);
  if (!record) return [];

  const direct = pickArray(record, [
    "availableTrips",
    "availabletrips",
    "trips",
    "availableTrip",
    "inventory",
    "inventories",
    "busList",
  ]);
  if (direct.length) return direct;

  for (const key of WRAPPER_KEYS) {
    const nested = record[key];
    if (Array.isArray(nested) && nested.length) {
      if (asRecord(nested[0])) return nested;
    }
    const found = extractTripList(nested);
    if (found.length) return found;
  }

  return collectArraysByKeyPattern(record, ["trip", "inventory", "bus"]);
}

export function extractSeatList(raw: unknown): unknown[] {
  const record = unwrapSeatSellerPayload(raw);
  if (!record) return [];

  const direct = pickArray(record, [
    "seats",
    "Seats",
    "seatList",
    "seatDetails",
    "seatLayout",
    "seatMap",
    "inventoryItems",
  ]);
  if (direct.length) return direct;

  const patterned = collectArraysByKeyPattern(record, ["seat"]);
  if (patterned.length) return patterned;

  for (const key of WRAPPER_KEYS) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = extractSeatList(item);
        if (found.length) return found;
      }
    } else {
      const found = extractSeatList(nested);
      if (found.length) return found;
    }
  }

  return [];
}

export function extractBoardingPoints(raw: unknown): unknown[] {
  const record = unwrapSeatSellerPayload(raw);
  if (!record) return [];

  const direct = pickArray(record, [
    "boardingPoints",
    "boardingpoints",
    "BoardingPoints",
    "boardingTimes",
    "boardingtimes",
    "bpList",
    "BPLt",
    "BPInformationList",
  ]);
  if (direct.length) return direct;

  return collectArraysByKeyPattern(record, ["boarding", "bp"]);
}

export function extractDroppingPoints(raw: unknown): unknown[] {
  const record = unwrapSeatSellerPayload(raw);
  if (!record) return [];

  const direct = pickArray(record, [
    "droppingPoints",
    "droppingpoints",
    "DroppingPoints",
    "droppingTimes",
    "droppingtimes",
    "dpList",
    "DPLt",
    "DPInformationList",
  ]);
  if (direct.length) return direct;

  return collectArraysByKeyPattern(record, ["dropping", "dp"]);
}

export function formatSeatSellerTime(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value).trim();
  if (raw.includes(":")) return raw;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return raw;
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function describeSeatSellerPayload(raw: unknown): PayloadShape {
  const record = asRecord(raw);
  if (!record) {
    return { topLevelKeys: [], arrayKeys: [], nestedPaths: [] };
  }

  const topLevelKeys = Object.keys(record);
  const arrayKeys = topLevelKeys.filter((k) => Array.isArray(record[k]));
  const nestedPaths: string[] = [];

  for (const key of topLevelKeys) {
    const value = record[key];
    if (Array.isArray(value) && value[0] && asRecord(value[0])) {
      nestedPaths.push(`${key}[0]: ${Object.keys(value[0] as object).join(", ")}`);
    } else {
      const nestedRecord = asRecord(value);
      if (nestedRecord) {
        nestedPaths.push(`${key}: ${Object.keys(nestedRecord).join(", ")}`);
      }
    }
  }

  return { topLevelKeys, arrayKeys, nestedPaths };
}

export function pickFareFromRecord(record: Record<string, unknown>): number | undefined {
  const direct = pickNumber(record, [
    "fare",
    "totalFare",
    "total_fare",
    "totalFareWithTaxes",
    "totalFareWithTax",
    "baseFare",
    "base_fare",
    "amount",
  ]);
  if (direct !== undefined && direct > 0) return direct;

  const fares = record.fares ?? record.fareDetails ?? record.fare_details;
  if (Array.isArray(fares) && fares[0]) {
    const row = asRecord(fares[0]);
    if (row) {
      const nested = pickNumber(row, ["totalFare", "baseFare", "fare", "amount"]);
      if (nested !== undefined && nested > 0) return nested;
    }
  }

  if (fares && typeof fares === "object" && !Array.isArray(fares)) {
    const values = Object.values(fares as Record<string, unknown>)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    if (values.length) return Math.min(...values);
  }

  if (typeof fares === "number" && fares > 0) return fares;

  return undefined;
}
