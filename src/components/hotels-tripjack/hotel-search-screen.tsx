"use client";

import { POPULAR_DESTINATIONS } from "@/components/hotels-tripjack/hotel-ui-theme";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelInfoBanner } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import type { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";

type HotelSearchScreenProps = ReturnType<typeof useTripJackHotelSearch>;

export function HotelSearchScreen(props: HotelSearchScreenProps) {
  const { onPopularDestination } = props;

  return (
    <HotelBookingLayout
      hero
      title="Search live TripJack hotels"
      subtitle="Search by city, destination, or hotel name. Live rates powered by TripJack."
      maxWidth="xl"
    >
      <TripJackSearchPanel
        {...props}
        variant="full"
        className="-mt-4 md:-mt-6"
        onSearch={() => void props.onSearch()}
      />

      <div className="mt-6">
        <p
          className="mb-2 text-xs font-bold uppercase tracking-wide"
          style={{ color: HOTEL_UI.textMuted }}
        >
          Popular searches
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest}
              type="button"
              className="rounded-full border bg-white px-4 py-2 text-sm font-medium transition hover:border-[#006CE4] hover:text-[#006CE4]"
              style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.text }}
              onClick={() => onPopularDestination(dest)}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <HotelInfoBanner variant="warning">
          You can search hotels by destination only. Hotel IDs are not required for customers.
        </HotelInfoBanner>
      </div>
    </HotelBookingLayout>
  );
}
