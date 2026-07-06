import { z } from "zod";
import { blockBusTicket, validateSeatGenderRules } from "@/lib/bus/booking-service";
import {
  busApiError,
  busPassengerSchema,
  formatBusApiValidationError,
  getBusUserId,
} from "@/lib/bus/api-helpers";
import { getSeatApiFare } from "@/lib/bus/fare-utils";
import { fetchTripDetails, fetchTripDetailsV2 } from "@/lib/seatseller/client";
import { parseSeatSellerTripDetails } from "@/lib/seatseller/parse-trip-details";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  sourceCityId: z.string().min(1),
  sourceCityName: z.string().min(1),
  destinationCityId: z.string().min(1),
  destinationCityName: z.string().min(1),
  doj: z.string().min(1),
  tripId: z.string().min(1),
  operatorName: z.string().min(1),
  busType: z.string().min(1),
  boardingPoint: z.object({
    id: z.string(),
    location: z.string(),
    time: z.string(),
  }),
  droppingPoint: z.object({
    id: z.string(),
    location: z.string(),
    time: z.string(),
  }),
  passengers: z.array(busPassengerSchema).min(1),
  callFareBreakupApi: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
  bpDpSeatLayout: z.boolean().optional(),
  operatorId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        formatBusApiValidationError(parsed.error.flatten()),
        400,
        parsed.error.flatten()
      );
    }

    const tripDetailsRaw =
      parsed.data.bpDpSeatLayout
        ? await fetchTripDetailsV2({
            inventoryId: parsed.data.tripId,
            bpId: parsed.data.boardingPoint.id,
            dpId: parsed.data.droppingPoint.id,
          })
        : await fetchTripDetails(parsed.data.tripId);
    const tripDetails = parseSeatSellerTripDetails(tripDetailsRaw);
    const maxSeats = tripDetails.maxSeatsPerTicket ?? 6;
    if (parsed.data.passengers.length > maxSeats) {
      return apiError(`Maximum ${maxSeats} seats allowed per ticket`, 400);
    }

    const passengers = parsed.data.passengers.map((passenger) => {
      const seat = tripDetails.seats.find((row) => row.name === passenger.seatName);
      if (!seat || seat.available === false) {
        throw new Error(`Seat ${passenger.seatName} is no longer available. Please reselect seats.`);
      }
      const liveFare = getSeatApiFare(seat);
      if (!liveFare || liveFare <= 0) {
        throw new Error(
          `Live fare missing for seat ${passenger.seatName}. Please reload seat layout and try again.`
        );
      }
      return {
        ...passenger,
        fare: liveFare,
        ladiesSeat: Boolean(seat.ladiesSeat ?? passenger.ladiesSeat),
      };
    });

    const genderError = validateSeatGenderRules(passengers, tripDetails.seats);
    if (genderError) return apiError(genderError, 400);

    const forced = tripDetails.forcedSeats ?? [];
    const femalePassengers = passengers.filter((p) => p.gender === "FEMALE");
    for (const forcedSeat of forced) {
      const taken = passengers.some((p) => p.seatName === forcedSeat);
      if (!taken && femalePassengers.length > 0) {
        return apiError(
          `Please select forced ladies seat ${forcedSeat} for female passenger`,
          400
        );
      }
    }

    if (parsed.data.bpDpSeatLayout && !parsed.data.operatorId) {
      return apiError(
        "Operator ID is missing for this bus service. Please search again and retry.",
        400
      );
    }

    const userId = await getBusUserId(request);
    const booking = await blockBusTicket({
      userId,
      ...parsed.data,
      passengers,
      callFareBreakupApi:
        parsed.data.callFareBreakupApi ?? tripDetails.callFareBreakupApi ?? false,
      operatorId: parsed.data.operatorId,
      bpDpSeatLayout: parsed.data.bpDpSeatLayout,
    });

    return apiSuccess({
      booking,
      blockExpiresAt: booking.blockExpiresAt,
      blockMinutes: 8,
    });
  } catch (error) {
    return busApiError(error, "Failed to block seats");
  }
}
