import type { FlightReviewSegment, NormalizedFlightBookingDetails } from "@/lib/tripjack/types";
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

function parseSegmentFromDetails(seg: Record<string, unknown>): FlightReviewSegment | null {
  const fd = asRecord(seg.fD);
  const airline = asRecord(fd?.aI);
  const da = asRecord(seg.da);
  const aa = asRecord(seg.aa);
  if (!da && !aa) return null;

  return {
    airlineCode: pickString(airline, ["code"], ""),
    airlineName: pickString(airline, ["name"], "Airline"),
    flightNumber: pickString(fd, ["fN"], ""),
    isLcc: false,
    departureAirportCode: pickString(da, ["code"], ""),
    departureAirportName: pickString(da, ["name"], ""),
    departureCity: pickString(da, ["city"], ""),
    departureTerminal: pickString(da, ["terminal"], ""),
    departureTime: pickString(seg, ["dt"], "").slice(11, 16) || pickString(seg, ["dt"], ""),
    arrivalAirportCode: pickString(aa, ["code"], ""),
    arrivalAirportName: pickString(aa, ["name"], ""),
    arrivalCity: pickString(aa, ["city"], ""),
    arrivalTerminal: pickString(aa, ["terminal"], ""),
    arrivalTime: pickString(seg, ["at"], "").slice(11, 16) || pickString(seg, ["at"], ""),
    durationMinutes: pickNumber(seg, ["duration"], 0),
  };
}

export function normalizeTripJackBookingDetails(
  bookRaw: unknown,
  detailsRaw: unknown
): NormalizedFlightBookingDetails | null {
  const detailsPayload = unwrapPayload(detailsRaw) ?? asRecord(detailsRaw);
  if (!detailsPayload) return null;

  const order = asRecord(detailsPayload.order) ?? detailsPayload;
  const itemInfos = asRecord(detailsPayload.itemInfos) ?? asRecord(order.itemInfos);
  const air = asRecord(itemInfos?.AIR) ?? asRecord(detailsPayload.AIR);

  const tripInfos = asArray(air?.tripInfos ?? detailsPayload.tripInfos);
  const travellerInfos = asArray(air?.travellerInfos ?? detailsPayload.travellerInfos);
  const totalPriceInfo = asRecord(air?.totalPriceInfo) ?? asRecord(order.totalPriceInfo);

  const segments: FlightReviewSegment[] = [];
  for (const trip of tripInfos) {
    const tripRecord = asRecord(trip);
    if (!tripRecord) continue;
    for (const seg of asArray(tripRecord.sI)) {
      const parsed = parseSegmentFromDetails(asRecord(seg) ?? {});
      if (parsed) segments.push(parsed);
    }
  }

  const passengers = travellerInfos.map((t) => {
    const row = asRecord(t);
    const fN = pickString(row, ["fN", "firstName"]);
    const lN = pickString(row, ["lN", "lastName"]);
    return {
      name: `${fN} ${lN}`.trim() || "Passenger",
      type: pickString(row, ["pt", "type"], "ADULT"),
      ticketNumber: pickString(row, ["ticketNumber", "pnr"], "") || undefined,
    };
  });

  const fd = asRecord(totalPriceInfo?.fd) ?? asRecord(totalPriceInfo);
  const adult = asRecord(fd?.ADULT);
  const fc = asRecord(adult?.fC);

  const bookingId =
    extractTripJackBookingId(detailsRaw) ||
    pickString(order, ["bookingId"], "") ||
    extractTripJackBookingId(bookRaw);

  return {
    bookingId,
    orderStatus: pickString(order, ["status", "orderStatus"], "unknown"),
    amount: pickNumber(order, ["amount", "totalAmount"], pickNumber(fc, ["TF", "tf"], 0)),
    pnr: pickString(air, ["pnr", "PNR"], pickString(order, ["pnr"], "")),
    airlinePnr: pickString(air, ["airlinePnr", "gdsPnr"], ""),
    ticketNumber: pickString(air, ["ticketNumber"], pickString(order, ["ticketNumber"], "")),
    passengers,
    tripInfos,
    flightSegments: segments,
    fareDetails: {
      baseFare: pickNumber(fc, ["BF", "bf"], 0),
      taxesAndFees: pickNumber(fc, ["TAF", "taf"], 0),
      totalFare: pickNumber(fc, ["TF", "tf"], 0),
      fareIdentifier: pickString(totalPriceInfo, ["fareIdentifier"], ""),
    },
    ticketStatus: pickString(air, ["ticketStatus", "status"], pickString(order, ["status"], "")),
    rawBookingResponse: bookRaw,
    rawBookingDetailsResponse: detailsRaw,
  };
}
