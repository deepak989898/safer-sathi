import "server-only";

import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { fetchTripJackHotelReview } from "@/lib/tripjack-hotels/client";
import type { HotelBookingRecord } from "@/lib/hotels/types";

export interface HotelPriceRevalidationResult {
  ok: boolean;
  priceChanged: boolean;
  previousPrice: number;
  currentPrice: number;
  currency: string;
  booking?: HotelBookingRecord;
  message?: string;
}

export async function revalidateHotelPriceBeforePayment(
  bookingId: string
): Promise<HotelPriceRevalidationResult> {
  const booking = await getHotelBookingById(bookingId);
  if (!booking) {
    return {
      ok: false,
      priceChanged: false,
      previousPrice: 0,
      currentPrice: 0,
      currency: "INR",
      message: "Booking not found",
    };
  }

  const review = booking.reviewNormalized;
  if (!review?.correlationId || !review.option?.optionId) {
    return {
      ok: false,
      priceChanged: false,
      previousPrice: booking.totalFare,
      currentPrice: booking.totalFare,
      currency: booking.currency,
      booking,
      message: "Review session missing. Please search again.",
    };
  }

  const prep = review.option;
  const previousPrice = booking.totalFare;
  const reviewHash = booking.reviewHash?.trim() ?? "";

  if (!reviewHash) {
    return {
      ok: false,
      priceChanged: false,
      previousPrice,
      currentPrice: previousPrice,
      currency: booking.currency,
      booking,
      message: "Review session missing. Please search again.",
    };
  }

  try {
    const result = await fetchTripJackHotelReview({
      correlationId: review.correlationId,
      optionId: prep.optionId,
      reviewHash,
      hid: review.tjHotelId,
      hotelName: review.hotelName,
      searchContext: review.searchContext,
    });

    const currentPrice = result.review.option.pricing.totalPrice;
    const priceChanged = Math.abs(currentPrice - previousPrice) >= 1;

    const updated = await updateHotelBooking(bookingId, {
      reviewNormalized: result.review,
      tripjackBookingId: result.review.bookingId || booking.tripjackBookingId,
      totalFare: currentPrice,
      baseFare: result.review.option.pricing.basePrice,
      taxesAndFees: result.review.option.pricing.taxes,
      mf: result.review.option.pricing.mf,
      mft: result.review.option.pricing.mft,
      discount: result.review.option.pricing.discount,
      currency: result.review.option.pricing.currency,
      roomName: result.review.option.roomInfo[0] || result.review.option.roomName,
      mealBasis:
        result.review.option.mealBasisLabel || result.review.option.mealBasis,
      priceRevalidatedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      priceChanged,
      previousPrice,
      currentPrice,
      currency: result.review.option.pricing.currency,
      booking: updated ?? booking,
      message: priceChanged
        ? "Hotel price has changed. Please confirm the updated amount before paying."
        : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price verification failed";
    return {
      ok: false,
      priceChanged: false,
      previousPrice,
      currentPrice: previousPrice,
      currency: booking.currency,
      booking,
      message,
    };
  }
}
