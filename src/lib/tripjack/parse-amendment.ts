import type {
  NormalizedCancellationCharges,
  NormalizedPollAmendment,
  NormalizedSubmitAmendment,
} from "@/lib/tripjack/types";

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

function pickNumber(record: Record<string, unknown> | null, keys: string[], fallback = 0): number {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;
  if (record.success === true && record.data) return asRecord(record.data);
  return record;
}

/** GetCharges sample: Complete_Trip_Response / SelectedTrip responses. */
export function normalizeCancellationCharges(
  raw: unknown
): NormalizedCancellationCharges | null {
  const payload = unwrapPayload(raw) ?? asRecord(raw);
  if (!payload) return null;

  const tripsRaw = asArray(payload.trips);
  let cancellationCharges = 0;
  let refundAmount = 0;

  const trips = tripsRaw.map((trip) => {
    const tripRecord = asRecord(trip);
    const amendmentInfo = asRecord(tripRecord?.amendmentInfo);
    const paxCharges: NormalizedCancellationCharges["trips"][number]["paxCharges"] = [];

    for (const type of ["ADULT", "CHILD", "INFANT"] as const) {
      const line = asRecord(amendmentInfo?.[type]);
      if (!line) continue;
      const amendmentCharges = pickNumber(line, ["amendmentCharges"], 0);
      const refund = pickNumber(line, ["refundAmount", "refundableamount"], 0);
      const totalFare = pickNumber(line, ["totalFare"], 0);
      cancellationCharges += amendmentCharges;
      refundAmount += refund;
      paxCharges.push({
        type,
        amendmentCharges,
        refundAmount: refund,
        totalFare,
      });
    }

    return {
      src: pickString(tripRecord, ["src"], ""),
      dest: pickString(tripRecord, ["dest"], ""),
      departureDate: pickString(tripRecord, ["departureDate", "date"], ""),
      flightNumbers: asArray(tripRecord?.flightNumbers).map(String),
      airlines: asArray(tripRecord?.airlines).map(String),
      paxCharges,
    };
  });

  // Samples do not include separate airline/supplier/convenience fee fields.
  return {
    bookingId: pickString(payload, ["bookingId"], ""),
    trips,
    cancellationCharges,
    refundAmount,
    refundableAmount: refundAmount,
    refundable: refundAmount > 0,
    airlineCharges: 0,
    supplierCharges: 0,
    convenienceFee: 0,
    totalRefund: refundAmount,
    cancellationDeadline:
      pickString(payload, ["cancellationDeadline", "lastCancellationDateTime"], "") ||
      trips[0]?.departureDate ||
      undefined,
    currency: pickString(payload, ["currency"], "INR"),
    rawResponse: raw,
  };
}

/** SubmitAmendment sample response. */
export function normalizeSubmitAmendment(raw: unknown): NormalizedSubmitAmendment | null {
  const payload = unwrapPayload(raw) ?? asRecord(raw);
  if (!payload) return null;

  const status = asRecord(payload.status);
  const amendmentId = pickString(payload, ["amendmentId"], "");
  if (!amendmentId && status?.success === false) return null;

  return {
    bookingId: pickString(payload, ["bookingId"], ""),
    amendmentId,
    success: status?.success !== false && Boolean(amendmentId),
    rawResponse: raw,
  };
}

/** Poll Amendment sample response. */
export function normalizePollAmendment(raw: unknown): NormalizedPollAmendment | null {
  const payload = unwrapPayload(raw) ?? asRecord(raw);
  if (!payload) return null;

  return {
    bookingId: pickString(payload, ["bookingId"], ""),
    amendmentId: pickString(payload, ["amendmentId"], ""),
    amendmentStatus: pickString(payload, ["amendmentStatus", "status"], "UNKNOWN").toUpperCase(),
    amendmentCharges: pickNumber(payload, ["amendmentCharges"], 0),
    refundableAmount: pickNumber(payload, ["refundableamount", "refundableAmount", "refundAmount"], 0),
    trips: asArray(payload.trips),
    rawResponse: raw,
  };
}
