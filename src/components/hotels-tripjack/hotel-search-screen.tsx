"use client";

import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelInfoBanner } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import type { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";

type HotelSearchScreenProps = ReturnType<typeof useTripJackHotelSearch>;

export function HotelSearchScreen(props: HotelSearchScreenProps) {
  return (
    <HotelBookingLayout
      hero
      title="Search live TripJack hotels"
      subtitle="Search by city or hotel name. Select dates and guests when you choose a room to book."
      maxWidth="xl"
    >
      <TripJackSearchPanel
        {...props}
        variant="full"
        destinationOnly
        className="-mt-4 md:-mt-6"
        onSearch={() => void props.onSearch()}
      />

      <div className="mt-6">
        <HotelInfoBanner variant="warning">
          You can search hotels by destination only. Hotel IDs are not required for customers.
        </HotelInfoBanner>
      </div>
    </HotelBookingLayout>
  );
}
