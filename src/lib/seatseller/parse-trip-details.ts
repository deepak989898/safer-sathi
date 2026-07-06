import type { SeatSellerSeat, SeatSellerTripDetails } from "@/lib/seatseller/types";
import { normalizeSeatSellerSeats } from "@/lib/bus/seat-layout-utils";
import {
  asRecord,
  extractBoardingPoints,
  extractDroppingPoints,
  extractSeatList,
  formatSeatSellerTime,
  pickBoolean,
  pickNumber,
  pickString,
  unwrapSeatSellerPayload,
} from "@/lib/seatseller/normalize";

export function parseSeatSellerTripDetails(raw: unknown): SeatSellerTripDetails {
  const record = unwrapSeatSellerPayload(raw) ?? asRecord(raw);
  if (!record) {
    return {
      availableTripId: "",
      maxSeatsPerTicket: 6,
      seats: [],
    };
  }

  const allSeats = extractSeatList(raw);

  return {
    ...record,
    availableTripId: pickString(record, ["availableTripId", "id", "tripId", "inventoryId"], ""),
    maxSeatsPerTicket: pickNumber(record, ["maxSeatsPerTicket", "max_seats_per_ticket", "maxSeats"], 6) ?? 6,
    callFareBreakupApi: pickBoolean(record, [
      "callFareBreakupApi",
      "call_fare_breakup_api",
      "callFareAPI",
    ]),
    forcedSeats: Array.isArray(record.forcedSeats)
      ? record.forcedSeats.map(String)
      : undefined,
    seats: normalizeSeatSellerSeats(allSeats as SeatSellerSeat[]),
  };
}

function mapBoardingPoints(items: unknown[]) {
  return items
    .map((item, index) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = pickString(
        row,
        ["id", "bpId", "bpid", "BpId", "pointId", "bp_id", "dpId", "dpid"],
        ""
      );
      if (!id) return null;

      const landmark = pickString(row, ["landmark", "Landmark", "bpLandmark"]);
      const address = pickString(row, ["address", "Address", "bpAddress", "bp_address"]);
      const contact = pickString(row, ["contactNumber", "contact", "phone", "mobile"]);
      const name = pickString(row, [
        "locationName",
        "location",
        "bpName",
        "BpName",
        "name",
        "Name",
        "bpLocation",
      ]);

      const location =
        name && name !== id
          ? name
          : landmark || address || `Boarding point ${index + 1}`;

      const time = formatSeatSellerTime(
        row.time ?? row.bpTime ?? row.BpTime ?? row.bpTimeString ?? row.Tm
      );

      return { id, location, time, landmark, address, contact: contact || undefined };
    })
    .filter((point): point is NonNullable<typeof point> => Boolean(point));
}

function mapDroppingPoints(items: unknown[]) {
  return items
    .map((item, index) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = pickString(
        row,
        ["id", "bpId", "bpid", "BpId", "dpId", "dpid", "DpId", "pointId", "dp_id", "bp_id"],
        ""
      );
      if (!id) return null;

      const landmark = pickString(row, ["landmark", "Landmark", "dpLandmark"]);
      const address = pickString(row, ["address", "Address", "dpAddress", "dp_address"]);
      const name = pickString(row, [
        "locationName",
        "location",
        "bpName",
        "BpName",
        "dpName",
        "DpName",
        "name",
        "Name",
        "dpLocation",
      ]);

      const location =
        name && name !== id
          ? name
          : landmark || address || `Dropping point ${index + 1}`;

      const time = formatSeatSellerTime(
        row.time ?? row.dpTime ?? row.DpTime ?? row.dpTimeString ?? row.Tm
      );

      return { id, location, time, landmark, address };
    })
    .filter((point): point is NonNullable<typeof point> => Boolean(point));
}

export function parseSeatSellerBpDp(raw: unknown): {
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
} {
  const record = unwrapSeatSellerPayload(raw) ?? asRecord(raw);
  if (!record) {
    return { boardingPoints: [], droppingPoints: [] };
  }

  const boardingRaw = extractBoardingPoints(record);
  const droppingRaw = extractDroppingPoints(record);

  return {
    boardingPoints: mapBoardingPoints(boardingRaw),
    droppingPoints: mapDroppingPoints(droppingRaw),
  };
}

export function parseTripEmbeddedBpDp(trip: Record<string, unknown> | null | undefined): {
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
} {
  if (!trip) return { boardingPoints: [], droppingPoints: [] };

  const boardingRaw = extractBoardingPoints(trip);
  const droppingRaw = extractDroppingPoints(trip);

  return {
    boardingPoints: mapBoardingPoints(boardingRaw),
    droppingPoints: mapDroppingPoints(droppingRaw),
  };
}
