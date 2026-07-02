import type { SeatSellerSeat, SeatSellerTrip } from "@/lib/seatseller/types";
import { getTripStartingFare } from "@/lib/seatseller/demo-data";

export interface NormalizedBusTrip extends SeatSellerTrip {
  id: string;
  startingFare: number;
  hasExactFare: boolean;
  viewFareRequired: boolean;
  bpDpSeatLayoutEnabled: boolean;
  embeddedBoardingCount: number;
  embeddedDroppingCount: number;
}

export interface NormalizedBusTrip extends SeatSellerTrip {
  id: string;
  startingFare: number;
  hasExactFare: boolean;
  viewFareRequired: boolean;
  bpDpSeatLayoutEnabled: boolean;
  embeddedBoardingCount: number;
  embeddedDroppingCount: number;
}

function asBoolean(value: unknown): boolean {
  return value === true || String(value).toLowerCase() === "true";
}

/** Full trip normalization for search results (Phase 1). */
export function normalizeBusTrip(raw: Record<string, unknown>): NormalizedBusTrip {
  const fareDetails = Array.isArray(raw.fareDetails)
    ? raw.fareDetails
    : Array.isArray(raw.fare_details)
      ? raw.fare_details
      : undefined;

  const boardingTimes = raw.boardingTimes ?? raw.boarding_times;
  const droppingTimes = raw.droppingTimes ?? raw.dropping_times;

  const trip: SeatSellerTrip = {
    ...raw,
    id: String(raw.id ?? raw.tripId ?? raw.inventoryId ?? raw.availableTripId ?? ""),
    travels:
      String(raw.travels ?? raw.operatorName ?? raw.operator_name ?? raw.busRoutes ?? "").trim() ||
      "Bus Operator",
    operator: String(raw.operator ?? raw.operatorName ?? raw.travels ?? "Bus Operator"),
    busType: String(raw.busType ?? raw.bus_type ?? "Bus"),
    departureTime: String(raw.departureTime ?? raw.departure_time ?? ""),
    arrivalTime: String(raw.arrivalTime ?? raw.arrival_time ?? ""),
    availableSeats: Number(raw.availableSeats ?? raw.available_seats ?? 0) || 0,
    maxSeatsPerTicket: Number(raw.maxSeatsPerTicket ?? raw.max_seats_per_ticket ?? 6) || 6,
    callFareBreakupApi: asBoolean(raw.callFareBreakupApi ?? raw.call_fare_breakup_api),
    bpDpSeatLayout: (raw.bpDpSeatLayout ?? raw.bp_dp_seat_layout) as SeatSellerTrip["bpDpSeatLayout"],
    cancellationPolicy: raw.cancellationPolicy
      ? String(raw.cancellationPolicy)
      : undefined,
    fareDetails: fareDetails as SeatSellerTrip["fareDetails"],
    fares: (raw.fares ?? raw.fare) as SeatSellerTrip["fares"],
    boardingTimes: boardingTimes as SeatSellerTrip["boardingTimes"],
    droppingTimes: droppingTimes as SeatSellerTrip["droppingTimes"],
    AC: asBoolean(raw.AC ?? raw.ac),
    seater: asBoolean(raw.seater),
    sleeper: asBoolean(raw.sleeper),
    mTicketEnabled: asBoolean(raw.mTicketEnabled ?? raw.mTicket),
  };

  const startingFare = getTripStartingFare(trip);

  return {
    ...trip,
    startingFare,
    hasExactFare: startingFare > 0,
    viewFareRequired: startingFare <= 0,
    bpDpSeatLayoutEnabled: asBoolean(trip.bpDpSeatLayout),
    embeddedBoardingCount: Array.isArray(boardingTimes) ? boardingTimes.length : 0,
    embeddedDroppingCount: Array.isArray(droppingTimes) ? droppingTimes.length : 0,
  };
}

/** Exact seat fare from API — never invent from seat number. */
export function getSeatApiFare(seat: SeatSellerSeat): number {
  const candidates = [
    seat.fare,
    seat.baseFare,
    seat.totalFare,
    seat.totalFareWithTaxes,
    (seat as Record<string, unknown>).totalFareWithTax,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function sumSeatFares(seats: SeatSellerSeat[]): number {
  return seats.reduce((sum, seat) => sum + getSeatApiFare(seat), 0);
}

export function extractUpdatedFareTotal(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  for (const key of ["totalFare", "total_fare", "fare", "amount"]) {
    const n = Number(record[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
