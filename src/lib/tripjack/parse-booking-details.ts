import type {
  FlightReviewSegment,
  NormalizedBookingPassenger,
  NormalizedFlightBookingDetails,
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
    isLcc: Boolean(airline?.isLcc),
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

function firstPnrFromDetails(pnrDetails: Record<string, unknown> | null): string {
  if (!pnrDetails) return "";
  for (const value of Object.values(pnrDetails)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function collectPassengerFares(
  tripInfos: unknown[]
): Array<{ name: string; type: string; baseFare: number; taxesAndFees: number; totalFare: number }> {
  const fares: Array<{
    name: string;
    type: string;
    baseFare: number;
    taxesAndFees: number;
    totalFare: number;
  }> = [];

  for (const trip of tripInfos) {
    const tripRecord = asRecord(trip);
    if (!tripRecord) continue;
    for (const seg of asArray(tripRecord.sI)) {
      const segRecord = asRecord(seg);
      const bI = asRecord(segRecord?.bI);
      for (const traveller of asArray(bI?.tI)) {
        const row = asRecord(traveller);
        const fd = asRecord(row?.fd);
        const fC = asRecord(fd?.fC);
        const fN = pickString(row, ["fN"]);
        const lN = pickString(row, ["lN"]);
        fares.push({
          name: `${fN} ${lN}`.trim() || "Passenger",
          type: pickString(row, ["pt"], "ADULT"),
          baseFare: pickNumber(fC, ["BF", "bf"], 0),
          taxesAndFees: pickNumber(fC, ["TAF", "taf"], 0),
          totalFare: pickNumber(fC, ["TF", "tf", "NF"], 0),
        });
      }
    }
  }

  return fares;
}

/** Normalize TripJack Booking Detail response (samples: BookingDetail.zip, Pax Pricing). */
export function normalizeTripJackBookingDetails(
  bookRaw: unknown,
  detailsRaw: unknown
): NormalizedFlightBookingDetails | null {
  const detailsPayload = unwrapPayload(detailsRaw) ?? asRecord(detailsRaw);
  if (!detailsPayload) return null;

  const order = asRecord(detailsPayload.order) ?? detailsPayload;
  const itemInfos = asRecord(detailsPayload.itemInfos) ?? asRecord(order.itemInfos);
  const air = asRecord(itemInfos?.AIR) ?? asRecord(detailsPayload.AIR);
  const delivery = asRecord(order.deliveryInfo) ?? asRecord(detailsPayload.deliveryInfo);
  const gstInfo = asRecord(detailsPayload.gstInfo) ?? {};

  const tripInfos = asArray(air?.tripInfos ?? detailsPayload.tripInfos);
  const travellerInfos = asArray(air?.travellerInfos ?? detailsPayload.travellerInfos);
  const totalPriceInfo =
    asRecord(air?.totalPriceInfo) ??
    asRecord(order.totalPriceInfo) ??
    asRecord(detailsPayload.totalPriceInfo);

  const segments: FlightReviewSegment[] = [];
  for (const trip of tripInfos) {
    const tripRecord = asRecord(trip);
    if (!tripRecord) continue;
    for (const seg of asArray(tripRecord.sI)) {
      const parsed = parseSegmentFromDetails(asRecord(seg) ?? {});
      if (parsed) segments.push(parsed);
    }
  }

  const passengers: NormalizedBookingPassenger[] = travellerInfos.map((t) => {
    const row = asRecord(t);
    const fN = pickString(row, ["fN", "firstName"]);
    const lN = pickString(row, ["lN", "lastName"]);
    const pnrDetails = asRecord(row?.pnrDetails);
    const pnr = firstPnrFromDetails(pnrDetails);
    const ticketNumber =
      pickString(row, ["ticketNumber", "ticketNo", "tN"], "") ||
      pickString(pnrDetails, ["ticketNumber", "ticketNo"], "") ||
      pnr ||
      undefined;
    const rawStatus = pickString(row, ["status", "bookingStatus", "ticketStatus"], "");
    return {
      title: pickString(row, ["ti"], ""),
      firstName: fN,
      lastName: lN,
      name: `${fN} ${lN}`.trim() || "Passenger",
      type: pickString(row, ["pt", "type"], "ADULT"),
      pnr: pnr || undefined,
      ticketNumber,
      status:
        rawStatus ||
        (pnr || ticketNumber ? "CONFIRMED" : "") ||
        undefined,
    };
  });

  const totalFareDetail = asRecord(totalPriceInfo?.totalFareDetail) ?? asRecord(totalPriceInfo);
  const fc = asRecord(totalFareDetail?.fC) ?? asRecord(totalFareDetail);
  const adult = asRecord(fc?.ADULT);
  const adultFc = asRecord(adult?.fC) ?? fc;

  const bookingId =
    extractTripJackBookingId(detailsRaw) ||
    pickString(order, ["bookingId"], "") ||
    extractTripJackBookingId(bookRaw);

  const pnrFromTravellers = passengers.map((p) => p.pnr || p.ticketNumber).find(Boolean) || "";
  const orderStatus =
    pickString(order, ["status", "orderStatus", "bookingStatus"], "") ||
    pickString(asRecord(order.status), ["status", "code"], "") ||
    pickString(air, ["status", "bookingStatus", "orderStatus"], "") ||
    pickString(detailsPayload, ["status", "orderStatus"], "unknown");
  const passengerFares = collectPassengerFares(tripInfos);

  return {
    bookingId,
    orderStatus,
    amount: pickNumber(order, ["amount", "totalAmount"], pickNumber(adultFc, ["TF", "tf"], 0)),
    markup: pickNumber(order, ["markup"], 0),
    pnr:
      pickString(air, ["pnr", "PNR"], "") ||
      pickString(order, ["pnr", "PNR"], "") ||
      pnrFromTravellers,
    airlinePnr:
      pickString(air, ["airlinePnr", "gdsPnr", "airlinePNR"], "") ||
      pickString(order, ["airlinePnr", "gdsPnr"], ""),
    ticketNumber:
      pickString(air, ["ticketNumber", "ticketNo"], "") ||
      pickString(order, ["ticketNumber", "ticketNo"], "") ||
      pnrFromTravellers,
    passengers,
    tripInfos,
    flightSegments: segments,
    fareDetails: {
      baseFare: pickNumber(adultFc, ["BF", "bf"], 0),
      taxesAndFees: pickNumber(adultFc, ["TAF", "taf"], 0),
      totalFare: pickNumber(adultFc, ["TF", "tf"], 0),
      netFare: pickNumber(adultFc, ["NF", "nf"], 0),
      fareIdentifier: pickString(totalPriceInfo, ["fareIdentifier"], ""),
    },
    gstInfo,
    deliveryInfo: {
      emails: asArray(delivery?.emails).map(String),
      contacts: asArray(delivery?.contacts).map(String),
    },
    isHoldBooking: orderStatus.toUpperCase() === "ON_HOLD",
    timeLimit: pickString(air, ["timeLimit"], ""),
    ticketStatus: pickString(air, ["ticketStatus", "status"], orderStatus),
    tripStatus: orderStatus,
    passengerFares,
    rawBookingResponse: bookRaw,
    rawBookingDetailsResponse: detailsRaw,
  };
}
