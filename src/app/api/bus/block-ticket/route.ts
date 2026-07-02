import { z } from "zod";
import { blockBusTicket, validateSeatGenderRules } from "@/lib/bus/booking-service";
import { busApiError, busPassengerSchema, getBusUserId } from "@/lib/bus/api-helpers";
import { fetchTripDetails } from "@/lib/seatseller/client";
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
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const tripDetails = parseSeatSellerTripDetails(await fetchTripDetails(parsed.data.tripId));
    const maxSeats = tripDetails.maxSeatsPerTicket ?? 6;
    if (parsed.data.passengers.length > maxSeats) {
      return apiError(`Maximum ${maxSeats} seats allowed per ticket`, 400);
    }

    const genderError = validateSeatGenderRules(
      parsed.data.passengers,
      tripDetails.seats
    );
    if (genderError) return apiError(genderError, 400);

    const forced = tripDetails.forcedSeats ?? [];
    const femalePassengers = parsed.data.passengers.filter((p) => p.gender === "FEMALE");
    for (const forcedSeat of forced) {
      const taken = parsed.data.passengers.some((p) => p.seatName === forcedSeat);
      if (!taken && femalePassengers.length > 0) {
        return apiError(
          `Please select forced ladies seat ${forcedSeat} for female passenger`,
          400
        );
      }
    }

    const userId = await getBusUserId(request);
    const booking = await blockBusTicket({
      userId,
      ...parsed.data,
      callFareBreakupApi:
        parsed.data.callFareBreakupApi ?? tripDetails.callFareBreakupApi ?? false,
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
