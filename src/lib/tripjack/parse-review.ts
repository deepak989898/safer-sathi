import type {
  FlightReviewSegment,
  NormalizedFlightReview,
  PaxFareLine,
} from "@/lib/tripjack/types";
import type { FlightSearchParams } from "@/lib/tripjack/types";

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

function pickBoolean(record: Record<string, unknown> | null, keys: string[]): boolean {
  if (!record) return false;
  for (const key of keys) {
    const value = record[key];
    if (value === true || String(value).toLowerCase() === "true") return true;
  }
  return false;
}

export function unwrapTripJackReviewPayload(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;

  if (record.success === true && record.data) {
    return asRecord(record.data);
  }

  return record;
}

function extractTripInfos(payload: Record<string, unknown>): unknown[] {
  const direct = asArray(payload.tripInfos);
  if (direct.length) return direct;

  for (const key of ["reviewResult", "result", "data"]) {
    const nested = asRecord(payload[key]);
    if (nested) {
      const trips = asArray(nested.tripInfos);
      if (trips.length) return trips;
    }
  }

  return [];
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

function formatDate(value: string): string {
  if (!value) return "";
  if (value.includes("T")) return value.slice(0, 10);
  return value.slice(0, 10);
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

function parsePaxFareLine(
  fd: Record<string, unknown>,
  type: "ADULT" | "CHILD" | "INFANT",
  count: number
): PaxFareLine | null {
  if (count <= 0) return null;
  const pax = asRecord(fd[type]) ?? asRecord(fd[type.toLowerCase()]);
  if (!pax) return null;

  const fc = asRecord(pax.fC) ?? asRecord(pax.fc);
  const baseFare = pickNumber(fc, ["BF", "bf", "baseFare"], 0);
  const taxesAndFees = pickNumber(fc, ["TAF", "taf", "taxes"], 0);
  const totalFare = pickNumber(fc, ["TF", "tf", "totalFare"], baseFare + taxesAndFees);
  const netFare = pickNumber(fc, ["NF", "nf", "netFare"], totalFare);

  return { type, count, baseFare, taxesAndFees, totalFare, netFare };
}

function detectFareAlert(payload: Record<string, unknown>): {
  fareUpdated: boolean;
  message: string | null;
} {
  const alerts = asArray(payload.alerts);
  const conditions = asRecord(payload.conditions);
  const messages = asArray(payload.messages);

  for (const item of [...alerts, ...messages]) {
    const row = asRecord(item);
    const text = pickString(row, ["message", "text", "description", "type"], "");
    if (/fare|price/i.test(text)) {
      return { fareUpdated: true, message: text || "Fare updated by airline. Please review the latest fare." };
    }
  }

  if (conditions) {
    const fareChanged = conditions.fareChanged ?? conditions.isFareChanged ?? conditions.priceChanged;
    if (fareChanged === true || String(fareChanged).toLowerCase() === "true") {
      return {
        fareUpdated: true,
        message: "Fare updated by airline. Please review the latest fare.",
      };
    }
  }

  return { fareUpdated: false, message: null };
}

function findPriceRow(trip: Record<string, unknown>, priceId?: string): Record<string, unknown> | null {
  const list = asArray(trip.totalPriceList).map(asRecord).filter(Boolean) as Record<string, unknown>[];
  if (!list.length) return null;
  if (priceId) {
    const match = list.find((p) => pickString(p, ["id", "priceId"]) === priceId);
    if (match) return match;
  }
  return list[0];
}

/** Normalize TripJack /fms/v1/review response. */
export function normalizeTripJackReview(
  rawResponse: unknown,
  options?: {
    priceId?: string;
    searchParams?: FlightSearchParams;
    searchTotalFare?: number;
  }
): NormalizedFlightReview | null {
  const payload = unwrapTripJackReviewPayload(rawResponse);
  if (!payload) return null;

  const tripInfos = extractTripInfos(payload);
  const trip = asRecord(tripInfos[0]);
  if (!trip) return null;

  const segments = asArray(trip.sI)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => Boolean(s))
    .map(parseSegment);

  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];
  const priceRow = findPriceRow(trip, options?.priceId);
  if (!priceRow) return null;

  const fd = asRecord(priceRow.fd) ?? {};
  const adult = asRecord(fd.ADULT) ?? asRecord(fd.adult);
  const baggage = asRecord(adult?.bI) ?? asRecord(adult?.bi);

  const adults = options?.searchParams?.adults ?? 1;
  const children = options?.searchParams?.children ?? 0;
  const infants = options?.searchParams?.infants ?? 0;

  const paxFares = (
    [
      parsePaxFareLine(fd, "ADULT", adults),
      parsePaxFareLine(fd, "CHILD", children),
      parsePaxFareLine(fd, "INFANT", infants),
    ] as const
  ).filter((line): line is PaxFareLine => Boolean(line));

  const sumField = (field: keyof PaxFareLine) =>
    paxFares.reduce((sum, line) => {
      if (field === "type" || field === "count") return sum;
      const value = line[field];
      return sum + Number(value) * line.count;
    }, 0);

  const adultFc = asRecord(adult?.fC) ?? asRecord(adult?.fc);
  const baseFare = paxFares.length ? sumField("baseFare") : pickNumber(adultFc, ["BF", "bf"], 0) * adults;
  const taxesAndFees = paxFares.length
    ? sumField("taxesAndFees")
    : pickNumber(adultFc, ["TAF", "taf"], 0) * adults;
  const totalFare = paxFares.length
    ? sumField("totalFare")
    : pickNumber(adultFc, ["TF", "tf"], 0) * adults;
  const netFare = paxFares.length
    ? sumField("netFare")
    : pickNumber(adultFc, ["NF", "nf", "TF", "tf"], totalFare);

  const totalDuration = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const segmentStopValues = asArray(trip.sI)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => Boolean(s))
    .map((s) => pickNumber(s, ["stops"], 0));
  const maxStops = segmentStopValues.length ? Math.max(...segmentStopValues) : 0;

  const segmentRaws = asArray(trip.sI)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => Boolean(s));
  const firstSegRaw = segmentRaws[0];
  const lastSegRaw = segmentRaws[segmentRaws.length - 1] ?? firstSegRaw;

  const { fareUpdated: alertFlag, message: alertMessage } = detectFareAlert(payload);
  const reviewedPriceId = pickString(priceRow, ["id", "priceId"], options?.priceId ?? "");
  const searchTotal = options?.searchTotalFare ?? 0;
  const fareChangedByAmount =
    searchTotal > 0 && totalFare > 0 && Math.abs(searchTotal - totalFare) > 0.01;

  return {
    airlineName: first.airlineName,
    airlineCode: first.airlineCode,
    flightNumber: first.flightNumber,
    isLcc: first.isLcc,
    departureAirportCode: first.departureAirportCode,
    departureAirportName: first.departureAirportName,
    departureCity: first.departureCity,
    departureTerminal: first.departureTerminal,
    departureTime: first.departureTime,
    departureDate: formatDate(pickString(firstSegRaw, ["dt", "departureTime"])),
    arrivalAirportCode: last.arrivalAirportCode,
    arrivalAirportName: last.arrivalAirportName,
    arrivalCity: last.arrivalCity,
    arrivalTerminal: last.arrivalTerminal,
    arrivalTime: last.arrivalTime,
    arrivalDate: formatDate(pickString(lastSegRaw, ["at", "arrivalTime"])),
    durationMinutes: totalDuration,
    durationFormatted: formatDuration(totalDuration),
    stops: maxStops,
    segments,
    priceId: reviewedPriceId,
    fareIdentifier: pickString(priceRow, ["fareIdentifier", "fareType"], "STANDARD"),
    baseFare,
    taxesAndFees,
    totalFare,
    netFare,
    paxFares,
    refundableType: mapRefundableType(adult?.rT ?? adult?.rt),
    cabinClass: pickString(adult, ["cc", "cabinClass"], "ECONOMY"),
    cabinBaggage: pickString(baggage, ["cB", "cb"], "—"),
    checkinBaggage: pickString(baggage, ["iB", "ib"], "—"),
    seatsRemaining: (() => {
      const sr = adult?.sR ?? adult?.sr;
      if (sr === undefined || sr === null || sr === "") return null;
      const n = Number(sr);
      return Number.isFinite(n) ? n : null;
    })(),
    ssrInfo: priceRow.ssrInfo ?? trip.ssrInfo ?? payload.ssrInfo ?? null,
    fareUpdated: alertFlag || fareChangedByAmount,
    fareAlertMessage:
      alertMessage ||
      (fareChangedByAmount
        ? "Fare updated by airline. Please review the latest fare."
        : null),
    rawReviewResponse: rawResponse,
  };
}
