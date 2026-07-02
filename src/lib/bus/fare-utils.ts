import type { SeatSellerSeat, SeatSellerTrip } from "@/lib/seatseller/types";
import {
  asRecord,
  extractBoardingPoints,
  extractDroppingPoints,
  formatSeatSellerTime,
  pickBoolean,
  pickFareFromRecord,
  pickNumber,
  pickString,
} from "@/lib/seatseller/normalize";

export interface NormalizedBusTrip extends SeatSellerTrip {
  id: string;
  startingFare: number;
  hasExactFare: boolean;
  viewFareRequired: boolean;
  bpDpSeatLayoutEnabled: boolean;
  embeddedBoardingCount: number;
  embeddedDroppingCount: number;
}

function resolveStartingFare(trip: SeatSellerTrip, raw: Record<string, unknown>): number {
  const fromRaw = pickFareFromRecord(raw);
  if (fromRaw !== undefined && fromRaw > 0) return fromRaw;

  if (trip.fareDetails?.length) {
    const fare = trip.fareDetails[0].totalFare ?? trip.fareDetails[0].baseFare;
    if (fare && Number(fare) > 0) return Number(fare);
  }
  if (Array.isArray(trip.fares) && trip.fares.length) {
    const fare = Number(trip.fares[0]);
    if (fare > 0) return fare;
  }
  if (typeof trip.fares === "number" && trip.fares > 0) return trip.fares;
  if (trip.fares && typeof trip.fares === "object") {
    const values = Object.values(trip.fares).map(Number).filter((n) => n > 0);
    if (values.length) return Math.min(...values);
  }

  return 0;
}

/** Normalize a single trip from sandbox/live available-trips item. */
export function normalizeBusTrip(raw: unknown): NormalizedBusTrip {
  const record = asRecord(raw) ?? {};

  const boardingRaw = extractBoardingPoints(record);
  const droppingRaw = extractDroppingPoints(record);

  const trip: SeatSellerTrip = {
    ...record,
    id: pickString(record, ["id", "tripId", "inventoryId", "availableTripId", "routeId"], ""),
    travels: pickString(
      record,
      ["travels", "operatorName", "operator_name", "busRoutes", "operator", "travelsName"],
      "Bus Operator"
    ),
    operator: pickString(record, ["operator", "operatorName", "travels", "travelsName"], "Bus Operator"),
    busType: pickString(record, ["busType", "bus_type", "busTypeName", "vehicleType"], "Bus"),
    departureTime: formatSeatSellerTime(
      record.departureTime ?? record.departure_time ?? record.depTime
    ),
    arrivalTime: formatSeatSellerTime(record.arrivalTime ?? record.arrival_time ?? record.arrTime),
    availableSeats:
      pickNumber(record, ["availableSeats", "available_seats", "seatsAvailable", "seatCount"]) ?? 0,
    maxSeatsPerTicket:
      pickNumber(record, ["maxSeatsPerTicket", "max_seats_per_ticket", "maxSeats"]) ?? 6,
    callFareBreakupApi: pickBoolean(record, [
      "callFareBreakupApi",
      "call_fare_breakup_api",
      "callFareAPI",
    ]),
    bpDpSeatLayout: (record.bpDpSeatLayout ??
      record.bp_dp_seat_layout ??
      record.bpDpLayout) as SeatSellerTrip["bpDpSeatLayout"],
    cancellationPolicy:
      pickString(record, ["cancellationPolicy", "cancellation_policy"], "") || undefined,
    duration: pickString(record, ["duration", "journeyDuration"], "") || undefined,
    fareDetails: (record.fareDetails ?? record.fare_details) as SeatSellerTrip["fareDetails"],
    fares: (record.fares ?? record.fare) as SeatSellerTrip["fares"],
    boardingTimes: (boardingRaw.length
      ? boardingRaw
      : record.boardingTimes ?? record.boarding_times) as SeatSellerTrip["boardingTimes"],
    droppingTimes: (droppingRaw.length
      ? droppingRaw
      : record.droppingTimes ?? record.dropping_times) as SeatSellerTrip["droppingTimes"],
    AC: pickBoolean(record, ["AC", "ac", "isAC"]),
    seater: pickBoolean(record, ["seater", "isSeater"]),
    sleeper: pickBoolean(record, ["sleeper", "isSleeper"]),
    mTicketEnabled: pickBoolean(record, ["mTicketEnabled", "mTicket"]),
  };

  const startingFare = resolveStartingFare(trip, record);

  return {
    ...trip,
    startingFare,
    hasExactFare: startingFare > 0,
    viewFareRequired: startingFare <= 0,
    bpDpSeatLayoutEnabled:
      pickBoolean(record, ["bpDpSeatLayout", "bp_dp_seat_layout", "bpDpLayout"]) === true,
    embeddedBoardingCount: boardingRaw.length,
    embeddedDroppingCount: droppingRaw.length,
  };
}

export function getSeatApiFare(seat: SeatSellerSeat): number {
  const record = asRecord(seat);
  const fare = record ? pickFareFromRecord(record) : undefined;
  return fare !== undefined && fare > 0 ? fare : 0;
}

export function sumSeatFares(seats: SeatSellerSeat[]): number {
  return seats.reduce((sum, seat) => sum + getSeatApiFare(seat), 0);
}

export function extractUpdatedFareTotal(raw: unknown): number | null {
  const record = asRecord(raw);
  if (!record) return null;
  const fare = pickFareFromRecord(record);
  return fare !== undefined && fare > 0 ? fare : null;
}
