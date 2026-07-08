import "server-only";

import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { applyHotelMarkupToReview } from "@/lib/tripjack-hotels/pricing-display";
import { fetchTripJackHotelReview } from "@/lib/tripjack-hotels/client";
import { getHotelWebsiteSettings } from "@/lib/hotels/website-settings";
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

  const reviewSession = booking.reviewNormalized;
  if (!reviewSession?.correlationId || !reviewSession.option?.optionId) {
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

  const prep = reviewSession.option;
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
    const settings = await getHotelWebsiteSettings();
    const markupPercent = Math.max(0, settings.hotelMarkupPercent ?? 0);

    const result = await fetchTripJackHotelReview({
      correlationId: reviewSession.correlationId,
      optionId: prep.optionId,
      reviewHash,
      hid: reviewSession.tjHotelId,
      hotelName: reviewSession.hotelName,
      searchContext: reviewSession.searchContext,
    });

    const freshReview = applyHotelMarkupToReview(result.review, markupPercent);
    const currentPrice = freshReview.option.pricing.totalPrice;
    const priceChanged = Math.abs(currentPrice - previousPrice) >= 1;

    const updated = await updateHotelBooking(bookingId, {
      reviewNormalized: freshReview,
      tripjackBookingId: freshReview.bookingId || booking.tripjackBookingId,
      totalFare: currentPrice,
      baseFare: freshReview.option.pricing.basePrice,
      taxesAndFees: freshReview.option.pricing.taxes,
      mf: freshReview.option.pricing.mf,
      mft: freshReview.option.pricing.mft,
      discount: freshReview.option.pricing.discount,
      currency: freshReview.option.pricing.currency,
      roomName: freshReview.option.roomInfo[0] || freshReview.option.roomName,
      mealBasis:
        freshReview.option.mealBasisLabel || freshReview.option.mealBasis,
      priceRevalidatedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      priceChanged,
      previousPrice,
      currentPrice,
      currency: freshReview.option.pricing.currency,
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
