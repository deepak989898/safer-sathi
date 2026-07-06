import type { NormalizedFlight } from "@/lib/tripjack/types";
import { extractTripJackAirlineLogoUrl } from "@/lib/flights/airline-logos";

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

/** Unwrap VPS proxy `{ success, data }` or raw TripJack body. */
export function unwrapTripJackPayload(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;

  if (record.success === true && record.data) {
    const data = asRecord(record.data);
    if (data) return data;
  }

  if (record.searchResult) return record;

  const data = asRecord(record.data);
  if (data?.searchResult) return data;

  return record;
}

export function extractOnwardTrips(raw: unknown): unknown[] {
  const payload = unwrapTripJackPayload(raw);
  if (!payload) return [];

  const searchResult = asRecord(payload.searchResult) ?? payload;
  const tripInfos = asRecord(searchResult.tripInfos) ?? asRecord(payload.tripInfos);

  if (!tripInfos) {
    return collectArraysByKeyPattern(searchResult, ["onward", "trip"]);
  }

  const onward =
    tripInfos.ONWARD ??
    tripInfos.onward ??
    tripInfos.Onward;

  if (Array.isArray(onward)) return onward;

  return [];
}

function collectArraysByKeyPattern(record: Record<string, unknown>, patterns: string[]): unknown[] {
  const collected: unknown[] = [];
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (!patterns.some((p) => lower.includes(p))) continue;
    const value = record[key];
    if (Array.isArray(value)) collected.push(...value);
  }
  return collected;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(isoOrTime: string): string {
  if (!isoOrTime) return "—";
  if (isoOrTime.includes("T")) {
    const d = new Date(isoOrTime);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  return isoOrTime.slice(0, 5);
}

function formatDate(isoOrTime: string): string {
  if (!isoOrTime) return "";
  if (isoOrTime.includes("T")) return isoOrTime.slice(0, 10);
  return isoOrTime.slice(0, 10);
}

function mapRefundableType(value: unknown): string {
  const n = Number(value);
  if (n === 0) return "Non-refundable";
  if (n === 1) return "Refundable";
  if (n === 2) return "Partially refundable";
  return value !== undefined && value !== null ? String(value) : "—";
}

function extractStopCities(segments: Record<string, unknown>[]): string[] {
  const cities: string[] = [];
  for (const segment of segments) {
    const stops = asArray(segment.so);
    for (const stop of stops) {
      const stopRecord = asRecord(stop);
      if (!stopRecord) continue;
      const city = pickString(stopRecord, ["city", "name", "code"]);
      if (city) cities.push(city);
    }
  }
  return cities;
}

function parseFlightSegments(trip: Record<string, unknown>) {
  const segments = asArray(trip.sI)
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => Boolean(s));

  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];

  const fd = asRecord(first.fD);
  const airline = asRecord(fd?.aI);

  const da = asRecord(first.da);
  const aa = asRecord(last.aa);

  const totalDuration = segments.reduce((sum, seg) => sum + pickNumber(seg, ["duration"], 0), 0);
  const maxStops = Math.max(...segments.map((seg) => pickNumber(seg, ["stops"], 0)));

  return {
    airlineName: pickString(airline, ["name"], "Airline"),
    airlineCode: pickString(airline, ["code"], ""),
    airlineLogoUrl: extractTripJackAirlineLogoUrl(airline),
    flightNumber: pickString(fd, ["fN", "flightNumber"], ""),
    departureAirportCode: pickString(da, ["code"], ""),
    departureCity: pickString(da, ["city", "name"], ""),
    departureTime: formatTime(pickString(first, ["dt", "departureTime"])),
    departureDate: formatDate(pickString(first, ["dt", "departureTime"])),
    arrivalAirportCode: pickString(aa, ["code"], ""),
    arrivalCity: pickString(aa, ["city", "name"], ""),
    arrivalTime: formatTime(pickString(last, ["at", "arrivalTime"])),
    arrivalDate: formatDate(pickString(last, ["at", "arrivalTime"])),
    durationMinutes: totalDuration || pickNumber(trip, ["duration"], 0),
    stops: maxStops,
    stopCities: extractStopCities(segments),
    segments,
  };
}

function pickPriceTotal(price: Record<string, unknown>): number {
  const fd = asRecord(price.fd);
  const adult = asRecord(fd?.ADULT) ?? asRecord(fd?.adult);
  const fareComponents = asRecord(adult?.fC) ?? asRecord(adult?.fc);
  return pickNumber(fareComponents, ["TF", "tf", "totalFare"], Number.MAX_SAFE_INTEGER);
}

function parsePriceOption(
  price: Record<string, unknown>,
  flightInfo: NonNullable<ReturnType<typeof parseFlightSegments>>,
  trip: Record<string, unknown>
): NormalizedFlight | null {
  const priceId = pickString(price, ["id", "priceId"]);
  if (!priceId) return null;

  const fd = asRecord(price.fd);
  const adult = asRecord(fd?.ADULT) ?? asRecord(fd?.adult);
  const fareComponents = asRecord(adult?.fC) ?? asRecord(adult?.fc);
  const baggage = asRecord(adult?.bI) ?? asRecord(adult?.bi);

  const baseFare = pickNumber(fareComponents, ["BF", "bf", "baseFare"], 0);
  const taxesAndFees = pickNumber(fareComponents, ["TAF", "taf", "taxes"], 0);
  const totalFare = pickNumber(fareComponents, ["TF", "tf", "totalFare"], baseFare + taxesAndFees);

  return {
    airlineName: flightInfo.airlineName,
    airlineCode: flightInfo.airlineCode,
    airlineLogoUrl: flightInfo.airlineLogoUrl,
    flightNumber: flightInfo.flightNumber,
    departureAirportCode: flightInfo.departureAirportCode,
    departureCity: flightInfo.departureCity,
    departureTime: flightInfo.departureTime,
    departureDate: flightInfo.departureDate,
    arrivalAirportCode: flightInfo.arrivalAirportCode,
    arrivalCity: flightInfo.arrivalCity,
    arrivalTime: flightInfo.arrivalTime,
    arrivalDate: flightInfo.arrivalDate,
    durationMinutes: flightInfo.durationMinutes,
    durationFormatted: formatDuration(flightInfo.durationMinutes),
    stops: flightInfo.stops,
    stopCities: flightInfo.stopCities,
    priceId,
    fareIdentifier: pickString(price, ["fareIdentifier", "fareType"], "STANDARD"),
    baseFare,
    taxesAndFees,
    totalFare: totalFare > 0 ? totalFare : baseFare + taxesAndFees,
    refundableType: mapRefundableType(adult?.rT ?? adult?.rt),
    cabinBaggage: pickString(baggage, ["cB", "cb", "cabinBaggage"], "—"),
    checkinBaggage: pickString(baggage, ["iB", "ib", "checkinBaggage"], "—"),
    seatsRemaining: (() => {
      const sr = adult?.sR ?? adult?.sr;
      if (sr === undefined || sr === null || sr === "") return null;
      const n = Number(sr);
      return Number.isFinite(n) ? n : null;
    })(),
    cabinClass: pickString(adult, ["cc", "cabinClass"], "ECONOMY"),
    // Never keep full TripJack trip/price objects in memory — freezes the browser with 200+ results.
    rawTrip: null,
    rawPrice: null,
  };
}

/** Normalize TripJack air-search-all response into flight cards (cheapest fare per onward trip). */
export function normalizeTripJackFlights(rawResponse: unknown): {
  flights: NormalizedFlight[];
  onwardCount: number;
  payloadShape: { topLevelKeys: string[]; tripInfoKeys: string[] };
} {
  const payload = unwrapTripJackPayload(rawResponse);
  const topLevelKeys = payload ? Object.keys(payload) : [];

  const searchResult = asRecord(payload?.searchResult);
  const tripInfos = asRecord(searchResult?.tripInfos);
  const tripInfoKeys = tripInfos ? Object.keys(tripInfos) : [];

  const onwardTrips = extractOnwardTrips(rawResponse);
  const flights: NormalizedFlight[] = [];

  for (const item of onwardTrips) {
    const trip = asRecord(item);
    if (!trip) continue;

    const flightInfo = parseFlightSegments(trip);
    if (!flightInfo) continue;

    const priceList = asArray(trip.totalPriceList)
      .map(asRecord)
      .filter((p): p is Record<string, unknown> => Boolean(p));

    if (!priceList.length) {
      flights.push({
        ...flightInfo,
        durationFormatted: formatDuration(flightInfo.durationMinutes),
        priceId: "",
        fareIdentifier: "—",
        baseFare: 0,
        taxesAndFees: 0,
        totalFare: 0,
        refundableType: "—",
        cabinBaggage: "—",
        checkinBaggage: "—",
        seatsRemaining: null,
        cabinClass: "ECONOMY",
        rawTrip: trip,
        rawPrice: null,
      });
      continue;
    }

    const cheapestPrice = [...priceList].sort((a, b) => {
      const aTotal = pickPriceTotal(a);
      const bTotal = pickPriceTotal(b);
      return aTotal - bTotal;
    })[0];

    const normalized = parsePriceOption(cheapestPrice, flightInfo, trip);
    if (normalized) flights.push(normalized);
  }

  flights.sort((a, b) => a.totalFare - b.totalFare || a.departureTime.localeCompare(b.departureTime));

  return {
    flights,
    onwardCount: onwardTrips.length,
    payloadShape: { topLevelKeys, tripInfoKeys },
  };
}

export function describeTripJackPayload(raw: unknown) {
  const payload = unwrapTripJackPayload(raw);
  const onward = extractOnwardTrips(raw);
  return {
    topLevelKeys: payload ? Object.keys(payload) : [],
    onwardCount: onward.length,
    sampleTripKeys:
      onward[0] && typeof onward[0] === "object"
        ? Object.keys(onward[0] as object)
        : [],
  };
}
