import type { SeatSellerTrip } from "@/lib/seatseller/types";
import { describeSeatSellerPayload, type PayloadShape } from "@/lib/seatseller/normalize";

export interface BusSearchDebug {
  sourceCityName: string;
  sourceCityId: string;
  destinationCityName: string;
  destinationCityId: string;
  journeyDateInput: string;
  journeyDateSentToApi: string;
  requestBody: Record<string, string>;
  apiUrl: string;
  apiMethod: string;
  rawSeatSellerResponse: unknown;
  payloadShape?: PayloadShape;
  parsedTripsCount: number;
  parsedTripsPreview: Array<Record<string, unknown>>;
  errorMessage: string | null;
  timestamp: string;
}

export function buildBusSearchDebug(input: {
  sourceCityName?: string;
  sourceCityId: string;
  destinationCityName?: string;
  destinationCityId: string;
  journeyDateInput: string;
  journeyDateSentToApi: string;
  requestBody: Record<string, string>;
  apiUrl: string;
  apiMethod?: string;
  rawSeatSellerResponse?: unknown;
  trips?: SeatSellerTrip[];
  errorMessage?: string | null;
}): BusSearchDebug {
  const trips = input.trips ?? [];
  return {
    sourceCityName: input.sourceCityName ?? "",
    sourceCityId: input.sourceCityId,
    destinationCityName: input.destinationCityName ?? "",
    destinationCityId: input.destinationCityId,
    journeyDateInput: input.journeyDateInput,
    journeyDateSentToApi: input.journeyDateSentToApi,
    requestBody: input.requestBody,
    apiUrl: input.apiUrl,
    apiMethod: input.apiMethod ?? "GET",
    rawSeatSellerResponse: input.rawSeatSellerResponse ?? null,
    payloadShape: describeSeatSellerPayload(input.rawSeatSellerResponse),
    parsedTripsCount: trips.length,
    parsedTripsPreview: trips.slice(0, 3).map((trip) => ({
      id: trip.id,
      travels: trip.travels ?? trip.operator,
      busType: trip.busType,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      availableSeats: trip.availableSeats,
    })),
    errorMessage: input.errorMessage ?? null,
    timestamp: new Date().toISOString(),
  };
}

export function logBusSearchDebug(debug: BusSearchDebug, label = "[bus-search-debug]"): void {
  if (process.env.NODE_ENV === "production") return;
  console.log(label, debug);
}
