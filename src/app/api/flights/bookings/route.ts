import { z } from "zod";
import { prepareFlightBookingFromSession } from "@/lib/flights/booking-service";
import { flightApiError, getFlightUserId } from "@/lib/flights/api-helpers";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";

const deliverySchema = z.object({
  email: z.string().email(),
  contact: z.string().min(10),
  countryCode: z.string().default("91"),
});

const passengerSchema = z.object({
  ti: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  pt: z.enum(["ADULT", "CHILD", "INFANT"]),
  fN: z.string().min(1),
  lN: z.string().min(1),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
});

const schema = z.object({
  review: z.record(z.string(), z.unknown()),
  validated: z.record(z.string(), z.unknown()),
  passengers: z.array(passengerSchema).min(1),
  delivery: deliverySchema,
  fareValidateRequest: z.record(z.string(), z.unknown()),
  fareValidateResponse: z.unknown().optional(),
  reviewResponse: z.unknown().optional(),
  searchContext: z
    .object({
      fromCode: z.string(),
      toCode: z.string(),
      departureDate: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const userId = await getFlightUserId(request);
    const booking = await prepareFlightBookingFromSession({
      userId,
      review: parsed.data.review as never,
      validated: parsed.data.validated as never,
      passengers: parsed.data.passengers as import("@/lib/tripjack/types").FlightPassengerFormRow[],
      delivery: parsed.data.delivery,
      fareValidateRequest: parsed.data.fareValidateRequest as never,
      fareValidateResponse: parsed.data.fareValidateResponse,
      reviewResponse: parsed.data.reviewResponse,
      searchContext: parsed.data.searchContext,
    });

    if (!booking.tripjackBookingId) {
      return apiError(
        "Booking ID missing from Review response. Cannot proceed to payment.",
        400
      );
    }

    return apiSuccess({ booking });
  } catch (err) {
    return flightApiError(err, "Failed to prepare flight booking");
  }
}

export async function GET(request: Request) {
  try {
    const auth = await optionalAuthenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);

    const { listFlightBookings } = await import("@/lib/flights/firestore");
    const bookings = await listFlightBookings({
      userId: auth.id,
      email: auth.email,
      limit: 50,
    });
    return apiSuccess({ bookings });
  } catch (err) {
    return flightApiError(err, "Failed to load flight bookings");
  }
}
