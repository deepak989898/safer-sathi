import type { SeatSellerTrip } from "@/lib/seatseller/types";
import { normalizeBusTrip } from "@/lib/bus/fare-utils";
import {
  describeSeatSellerPayload,
  extractTripList,
} from "@/lib/seatseller/normalize";

export function parseSeatSellerTrips(rawResponse: unknown): {
  trips: SeatSellerTrip[];
  responseKeys: string[];
  payloadShape: ReturnType<typeof describeSeatSellerPayload>;
} {
  const payloadShape = describeSeatSellerPayload(rawResponse);

  if (!rawResponse) {
    return { trips: [], responseKeys: [], payloadShape };
  }

  const tripList = extractTripList(rawResponse);
  const responseKeys =
    rawResponse && typeof rawResponse === "object" && !Array.isArray(rawResponse)
      ? Object.keys(rawResponse as object)
      : [];

  const trips = tripList
    .filter((item) => item && typeof item === "object")
    .map((item) => normalizeBusTrip(item))
    .filter((trip) => Boolean(trip.id));

  return { trips, responseKeys, payloadShape };
}
