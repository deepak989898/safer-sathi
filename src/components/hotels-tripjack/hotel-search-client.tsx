"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HotelSearchScreen } from "@/components/hotels-tripjack/hotel-search-screen";
import { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";

function HotelSearchClientInner() {
  const searchParams = useSearchParams();
  const initialDestination = searchParams.get("destination")?.trim() ?? "";

  const search = useTripJackHotelSearch({
    initialDestination,
    initialParams: initialDestination
      ? { destination: initialDestination, destinationLabel: initialDestination }
      : undefined,
  });

  return <HotelSearchScreen {...search} />;
}

export function HotelSearchClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading search…
        </div>
      }
    >
      <HotelSearchClientInner />
    </Suspense>
  );
}
