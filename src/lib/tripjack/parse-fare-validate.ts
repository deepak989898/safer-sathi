import type {
  FareValidateRequest,
  FlightReviewSegment,
  NormalizedFareValidate,
} from "@/lib/tripjack/types";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";

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

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(value: string): string {
  if (!value) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  return value.slice(0, 5);
}

function mapRefundableType(value: unknown): string {
  const n = Number(value);
  if (n === 0) return "Non-refundable";
  if (n === 1) return "Refundable";
  if (n === 2) return "Partially refundable";
  return value !== undefined && value !== null ? String(value) : "—";
}

function parseSegment(seg: Record<string, unknown>): FlightReviewSegment {
  const fd = asRecord(seg.fD);
  const airline = asRecord(fd?.aI);
  const da = asRecord(seg.da);
  const aa = asRecord(seg.aa);

  return {
    airlineCode: pickString(airline, ["code"], ""),
    airlineName: pickString(airline, ["name"], "Airline"),
    flightNumber: pickString(fd, ["fN", "flightNumber"], ""),
    isLcc: pickBoolean(airline, ["isLcc", "isLCC"]),
    departureAirportCode: pickString(da, ["code"], ""),
    departureAirportName: pickString(da, ["name"], ""),
    departureCity: pickString(da, ["city", "name"], ""),
    departureTerminal: pickString(da, ["terminal"], ""),
    departureTime: formatTime(pickString(seg, ["dt", "departureTime"])),
    arrivalAirportCode: pickString(aa, ["code"], ""),
    arrivalAirportName: pickString(aa, ["name"], ""),
    arrivalCity: pickString(aa, ["city", "name"], ""),
    arrivalTerminal: pickString(aa, ["terminal"], ""),
    arrivalTime: formatTime(pickString(seg, ["at", "arrivalTime"])),
    durationMinutes: pickNumber(seg, ["duration"], 0),
  };
}

function pickBoolean(record: Record<string, unknown> | null, keys: string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    const value = record[key];
    if (value === true || String(value).toLowerCase() === "true") return true;
  }
  return false;
}

function findPriceRow(segment: Record<string, unknown>): Record<string, unknown> | null {
  const list = asArray(segment.priceInfoList ?? segment.totalPriceList)
    .map(asRecord)
    .filter((p): p is Record<string, unknown> => Boolean(p));
  return list[0] ?? null;
}

function sumPaxFares(fd: Record<string, unknown>, types: string[]): {
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  netFare: number;
} {
  let baseFare = 0;
  let taxesAndFees = 0;
  let totalFare = 0;
  let netFare = 0;

  for (const type of types) {
    const pax = asRecord(fd[type]) ?? asRecord(fd[type.toLowerCase()]);
    if (!pax) continue;
    const fc = asRecord(pax.fC) ?? asRecord(pax.fc);
    baseFare += pickNumber(fc, ["BF", "bf"], 0);
    taxesAndFees += pickNumber(fc, ["TAF", "taf"], 0);
    totalFare += pickNumber(fc, ["TF", "tf"], 0);
    netFare += pickNumber(fc, ["NF", "nf", "TF", "tf"], 0);
  }

  return { baseFare, taxesAndFees, totalFare, netFare };
}

function detectFareChanged(payload: Record<string, unknown>, previousTotal?: number): {
  fareChanged: boolean;
  message: string | null;
} {
  const alerts = asArray(payload.alerts);
  for (const item of alerts) {
    const row = asRecord(item);
    const text = pickString(row, ["message", "text", "type"], "");
    if (/fare|price/i.test(text)) {
      return { fareChanged: true, message: "Fare updated. Please review the latest fare before payment." };
    }
  }

  if (previousTotal && previousTotal > 0) {
    const conditions = asRecord(payload.conditions);
    const flag = conditions?.fareChanged ?? conditions?.isFareChanged;
    if (flag === true || String(flag).toLowerCase() === "true") {
      return { fareChanged: true, message: "Fare updated. Please review the latest fare before payment." };
    }
  }

  return { fareChanged: false, message: null };
}

export function normalizeTripJackFareValidate(
  rawResponse: unknown,
  request: FareValidateRequest,
  options?: { previousTotalFare?: number }
): NormalizedFareValidate | null {
  const payload = unwrapPayload(rawResponse);
  if (!payload) return null;

  const tripInfos = asArray(payload.tripInfos);
  const trip = asRecord(tripInfos[0]);
  if (!trip) return null;

  const segmentRaws = asArray(trip.sI)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => Boolean(s));

  const segments = segmentRaws.map(parseSegment);
  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];
  const firstSegRaw = segmentRaws[0];
  const priceRow = findPriceRow(firstSegRaw) ?? findPriceRow(trip);
  if (!priceRow) return null;

  const fd = asRecord(priceRow.fd) ?? {};
  const adult = asRecord(fd.ADULT) ?? asRecord(fd.adult);
  const baggage = asRecord(adult?.bI) ?? asRecord(adult?.bi);
  const paxTypes = ["ADULT", "CHILD", "INFANT"].filter(
    (t) => asRecord(fd[t]) ?? asRecord(fd[t.toLowerCase()])
  );
  const fares = sumPaxFares(fd, paxTypes.length ? paxTypes : ["ADULT"]);

  const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const { fareChanged, message } = detectFareChanged(payload, options?.previousTotalFare);
  const validatedTotal = fares.totalFare || pickNumber(asRecord(adult?.fC), ["TF", "tf"], 0);
  const amountChanged =
    options?.previousTotalFare &&
    options.previousTotalFare > 0 &&
    validatedTotal > 0 &&
    Math.abs(options.previousTotalFare - validatedTotal) > 0.01;

  return {
    bookingId: extractTripJackBookingId(rawResponse) || request.bookingId,
    tripInfos,
    segments,
    airlineName: first.airlineName,
    airlineCode: first.airlineCode,
    flightNumber: first.flightNumber,
    departureAirportCode: first.departureAirportCode,
    departureCity: first.departureCity,
    departureTime: first.departureTime,
    arrivalAirportCode: last.arrivalAirportCode,
    arrivalCity: last.arrivalCity,
    arrivalTime: last.arrivalTime,
    durationMinutes: totalDuration,
    durationFormatted: formatDuration(totalDuration),
    totalFare: validatedTotal,
    baseFare: fares.baseFare,
    taxesAndFees: fares.taxesAndFees,
    netFare: fares.netFare || validatedTotal,
    fareIdentifier: pickString(priceRow, ["fareIdentifier", "fareType"], "STANDARD"),
    priceId: pickString(priceRow, ["id", "priceId"], ""),
    refundableType: mapRefundableType(adult?.rT ?? adult?.rt),
    baggage: {
      cabin: pickString(baggage, ["cB", "cb"], "—"),
      checkin: pickString(baggage, ["iB", "ib"], "—"),
    },
    ssrInfo: firstSegRaw.ssrInfo ?? trip.ssrInfo ?? payload.ssrInfo ?? null,
    travellerInfo: request.travellerInfo,
    deliveryInfo: request.deliveryInfo,
    fareChanged: fareChanged || Boolean(amountChanged),
    fareAlertMessage:
      message ||
      (amountChanged ? "Fare updated. Please review the latest fare before payment." : null),
    rawFareValidateResponse: rawResponse,
  };
}
