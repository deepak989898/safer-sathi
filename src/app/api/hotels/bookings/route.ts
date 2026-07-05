import { z } from "zod";
import { prepareHotelBookingFromReview } from "@/lib/hotels/booking-service";
import { assertTripJackHotelBookingAllowed, hotelApiError, requireHotelUserAuth } from "@/lib/hotels/api-helpers";
import { listHotelBookings } from "@/lib/hotels/firestore";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { isHotelSearchSessionExpired } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { HotelGuestDetailsForm } from "@/lib/hotels/types";

const primaryGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  email: z.string().email(),
  mobile: z.string().min(10),
  countryCode: z.string().default("91"),
  nationality: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  zipCode: z.string().min(1),
  pan: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  passportNationality: z.string().optional(),
  passportIssueCountry: z.string().optional(),
});

const roomGuestSchema = z.object({
  title: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  gender: z.enum(["Male", "Female", "Other"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  type: z.enum(["ADULT", "CHILD"]),
  age: z.number().int().min(0).max(17).optional(),
});

const schema = z.object({
  review: z.record(z.string(), z.unknown()),
  guestDetails: z.object({
    primaryGuest: primaryGuestSchema,
    roomGuests: z.array(z.array(roomGuestSchema)),
    specialRequests: z.string().optional(),
    gstNumber: z.string().optional(),
    gstCompanyName: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    if (isHotelSearchSessionExpired()) {
      return apiError("Session expired. Please search hotels again.", 400, {
        code: "SEARCH_SESSION_EXPIRED",
        backToSearch: true,
      });
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const review = parsed.data.review as unknown as NormalizedHotelReviewResult;
    const guestDetails = parsed.data.guestDetails as HotelGuestDetailsForm;

    if (review.option.panRequired && !guestDetails.primaryGuest.pan?.trim()) {
      return apiError("PAN number is required for this hotel", 400, { code: "PAN_MISSING" });
    }
    if (review.option.passportRequired) {
      const pg = guestDetails.primaryGuest;
      if (!pg.passportNumber?.trim() || !pg.passportExpiry?.trim()) {
        return apiError("Passport details are required for this hotel", 400, {
          code: "PASSPORT_MISSING",
        });
      }
    }

    for (let i = 0; i < review.searchContext.rooms.length; i += 1) {
      const room = review.searchContext.rooms[i];
      const guests = guestDetails.roomGuests[i] ?? [];
      const adultsNeeded = room.adults ?? 1;
      const childrenNeeded = room.children ?? 0;
      const adults = guests.filter((g) => g.type === "ADULT");
      const children = guests.filter((g) => g.type === "CHILD");
      if (adults.length < adultsNeeded) {
        return apiError(`Room ${i + 1}: enter all adult guest names`, 400);
      }
      if (children.length < childrenNeeded) {
        return apiError(`Room ${i + 1}: enter all child guest names`, 400);
      }
      for (const child of children) {
        if (child.age == null) {
          return apiError(`Room ${i + 1}: child age is required`, 400);
        }
      }
    }

    const auth = await requireHotelUserAuth(request);
    if ("error" in auth) return auth.error;

    const bookingAllowed = await assertTripJackHotelBookingAllowed();
    if ("error" in bookingAllowed) return bookingAllowed.error;

    const booking = await prepareHotelBookingFromReview({
      userId: auth.userId,
      review,
      guestDetails,
    });

    if (!booking.tripjackBookingId) {
      return apiError("TripJack booking ID missing. Cannot proceed to payment.", 400);
    }

    return apiSuccess({ booking });
  } catch (err) {
    return hotelApiError(err, "Failed to prepare hotel booking");
  }
}

export async function GET(request: Request) {
  try {
    const auth = await optionalAuthenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);

    const bookings = await listHotelBookings({
      userId: auth.id,
      email: auth.email,
      limit: 50,
    });
    return apiSuccess({ bookings });
  } catch (err) {
    return hotelApiError(err, "Failed to load hotel bookings");
  }
}
