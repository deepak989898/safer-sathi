"use client";

import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";
import { cn } from "@/lib/utils";

interface TripJackQuickSearchBarProps {
  className?: string;
  placeholder?: string;
}

/** City/hotel search input always visible — results open on /hotels/results. */
export function TripJackQuickSearchBar({ className }: TripJackQuickSearchBarProps) {
  const search = useTripJackHotelSearch({ redirectToResults: true });

  return (
    <TripJackSearchPanel
      {...search}
      variant="full"
      destinationOnly
      className={cn(className)}
      onSearch={() => void search.onSearch()}
    />
  );
}
