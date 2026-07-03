function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickString(record: Record<string, unknown> | null, keys: string[], fallback = ""): string {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

function looksLikeBookingId(value: string): boolean {
  return /^TJ\d+/i.test(value) || value.length >= 8;
}

/** Extract bookingId from Review / Fare Validate raw TripJack payloads. */
export function extractTripJackBookingId(raw: unknown): string {
  const visited = new Set<unknown>();

  function walk(node: unknown, depth = 0): string {
    if (!node || depth > 8 || visited.has(node)) return "";
    visited.add(node);

    if (typeof node === "string" && looksLikeBookingId(node)) return node;

    const record = asRecord(node);
    if (!record) return "";

    const direct = pickString(record, ["bookingId", "booking_id", "BookingId"]);
    if (direct && looksLikeBookingId(direct)) return direct;

    if (record.success === true && record.data) {
      const fromData = walk(record.data, depth + 1);
      if (fromData) return fromData;
    }

    for (const key of ["data", "reviewResult", "result", "searchQuery"]) {
      const nested = record[key];
      const found = walk(nested, depth + 1);
      if (found) return found;
    }

    const tripInfos = asArray(record.tripInfos);
    for (const trip of tripInfos) {
      const found = walk(trip, depth + 1);
      if (found) return found;
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = walk(item, depth + 1);
          if (found) return found;
        }
      } else if (value && typeof value === "object") {
        const found = walk(value, depth + 1);
        if (found) return found;
      }
    }

    return "";
  }

  return walk(raw);
}
