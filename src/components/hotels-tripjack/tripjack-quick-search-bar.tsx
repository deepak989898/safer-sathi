"use client";

import { forwardRef, useImperativeHandle } from "react";
import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";
import { cn } from "@/lib/utils";

export interface TripJackQuickSearchBarHandle {
  focusDestination: () => void;
}

interface TripJackQuickSearchBarProps {
  className?: string;
  placeholder?: string;
}

/** City/hotel search input always visible — results open on /hotels/results. */
export const TripJackQuickSearchBar = forwardRef<
  TripJackQuickSearchBarHandle,
  TripJackQuickSearchBarProps
>(function TripJackQuickSearchBar({ className }, ref) {
  const search = useTripJackHotelSearch({ redirectToResults: true });

  useImperativeHandle(ref, () => ({
    focusDestination: search.focusDestination,
  }));

  return (
    <TripJackSearchPanel
      {...search}
      variant="full"
      destinationOnly
      className={cn(className)}
      onSearch={() => void search.onSearch()}
    />
  );
});
