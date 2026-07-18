"use client";

import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelCard } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

export const HOTEL_BOOKING_STEPS = [
  "Search",
  "Select Room",
  "Guests",
  "Review",
  "Payment",
] as const;

export function countHotelNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function hotelGuestOccupancySummary(
  rooms: NormalizedHotelReviewResult["searchContext"]["rooms"]
): string {
  let adults = 0;
  let children = 0;
  for (const room of rooms) {
    adults += Number(room.adults) || 0;
    children += Number(room.children) || 0;
  }
  return `${rooms.length} room${rooms.length === 1 ? "" : "s"} · ${adults} adult${adults === 1 ? "" : "s"}${
    children > 0 ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""
  }`;
}

interface HotelLockedBookingSummaryProps {
  review: NormalizedHotelReviewResult;
  locale: Locale;
  showCancellation?: boolean;
}

/** Locked TripJack review summary shown on Guests + final Review pages. */
export function HotelLockedBookingSummary({
  review,
  locale,
  showCancellation = false,
}: HotelLockedBookingSummaryProps) {
  const option = review.option;
  const nights = countHotelNights(review.searchContext.checkIn, review.searchContext.checkOut);

  return (
    <div className="space-y-4">
      <HotelCard>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: HOTEL_UI.success }}>
          Review confirmed · Price locked
        </p>
        <h2 className="mt-1 text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
          {review.hotelName}
        </h2>
        <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
          Ref: <span className="font-mono">{review.bookingId}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
            {review.searchContext.checkIn} → {review.searchContext.checkOut}
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
            {nights} night{nights === 1 ? "" : "s"}
          </span>
          <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
            {hotelGuestOccupancySummary(review.searchContext.rooms)}
          </span>
        </div>
      </HotelCard>

      <HotelCard>
        <h3 className="font-bold" style={{ color: HOTEL_UI.primary }}>
          Hotel &amp; Room Details
        </h3>
        <p className="mt-2 text-lg font-semibold">{option.roomInfo[0] || option.roomName}</p>
        <p className="text-sm" style={{ color: HOTEL_UI.textMuted }}>
          {option.mealBasisLabel} · {option.isRefundable ? "Refundable" : "Non-refundable"}
        </p>
        {option.inclusions.length > 0 && (
          <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
            Inclusions: {option.inclusions.join(", ")}
          </p>
        )}
      </HotelCard>

      {showCancellation ? (
        <HotelCancellationTimeline
          isRefundable={option.isRefundable}
          freeCancellationUntil={option.freeCancellationUntil}
          penalties={option.penalties}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
