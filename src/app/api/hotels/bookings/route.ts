import { z } from "zod";
import { prepareHotelBookingFromReview } from "@/lib/hotels/booking-service";
import {
  assertTripJackHotelBookingAllowed,
  getHotelUserId,
  hotelApiError,
} from "@/lib/hotels/api-helpers";
import { listHotelBookings } from "@/lib/hotels/firestore";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { isHotelReviewSearchSessionExpired } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { HotelGuestDetailsForm } from "@/lib/hotels/types";
import {
  normalizeGuestDetailsForm,
  validateGuestDetailsForm,
  validatePan,
  validatePassportExpiry,
  validatePassportNumber,
} from "@/lib/hotels/guest-validation";

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
  reviewHash: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const review = parsed.data.review as unknown as NormalizedHotelReviewResult;
    let guestDetails = parsed.data.guestDetails as HotelGuestDetailsForm;

    guestDetails = normalizeGuestDetailsForm(guestDetails, {
      panRequired: review.option.panRequired,
      passportRequired: review.option.passportRequired,
    });

    const validationErrors = validateGuestDetailsForm(guestDetails, {
      panRequired: review.option.panRequired,
      passportRequired: review.option.passportRequired,
    });
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      return apiError(firstError ?? "Guest details are invalid", 400, {
        code: "GUEST_VALIDATION_FAILED",
        fieldErrors: validationErrors,
      });
    }

    if (isHotelReviewSearchSessionExpired(review)) {
      return apiError("Session expired. Please search hotels again.", 400, {
        code: "SEARCH_SESSION_EXPIRED",
        backToSearch: true,
      });
    }

    if (review.option.panRequired) {
      const panError = validatePan(guestDetails.primaryGuest.pan ?? "", true);
      if (panError) {
        return apiError(panError, 400, { code: "PAN_MISSING" });
      }
    }
    if (review.option.passportRequired) {
      const pg = guestDetails.primaryGuest;
      const passportNumberError = validatePassportNumber(pg.passportNumber ?? "", true);
      const passportExpiryError = validatePassportExpiry(pg.passportExpiry ?? "", true);
      if (passportNumberError || passportExpiryError) {
        return apiError(passportNumberError ?? passportExpiryError ?? "Passport details are required", 400, {
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

    const userId = await getHotelUserId(request);

    const bookingAllowed = await assertTripJackHotelBookingAllowed();
    if ("error" in bookingAllowed) return bookingAllowed.error;

    const booking = await prepareHotelBookingFromReview({
      userId,
      review,
      guestDetails,
      reviewHash: parsed.data.reviewHash,
    });

    if (!booking.tripjackBookingId) {
      return apiError("Booking reference missing. Please go back to Review and try again.", 400);
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
