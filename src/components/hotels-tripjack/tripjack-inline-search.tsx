"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TripJackHotelGridCard } from "@/components/hotels-tripjack/tripjack-hotel-grid-card";
import { TripJackResultsGridSkeleton } from "@/components/hotels-tripjack/tripjack-hotel-grid-skeleton";
import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import { bootstrapFeaturedTripJackHotel } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";
import { loadHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

export function TripJackInlineSearchSection() {
  const router = useRouter();
  const { locale } = useAppStore();
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [contextLabel, setContextLabel] = useState("");
  const [openingId, setOpeningId] = useState<string | number | null>(null);

  const reloadResults = useCallback(() => {
    const session = loadHotelListingSession();
    setHotels(session.hotels);
    setContextLabel(session.request?.destinationLabel ?? session.request?.destination ?? "");
  }, []);

  const search = useTripJackHotelSearch({
    redirectToResults: false,
    onSearchSuccess: reloadResults,
  });

  const onViewDetails = async (hotel: NormalizedHotel) => {
    if (openingId != null) return;
    setOpeningId(hotel.tjHotelId);
    try {
      const result = await bootstrapFeaturedTripJackHotel({
        tjHotelId: Number(hotel.tjHotelId),
        hotelName: hotel.name,
        location: hotel.location,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <TripJackSearchPanel
        {...search}
        variant="full"
        destinationOnly
        onSearch={() => void search.onSearch()}
      />

      {search.loading && <TripJackResultsGridSkeleton count={6} />}

      {!search.loading && hotels.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#0c2444]">
            {hotels.length} hotel{hotels.length === 1 ? "" : "s"}
            {contextLabel ? ` in ${contextLabel}` : ""}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {hotels.map((hotel) => (
              <div key={String(hotel.tjHotelId)} className="relative">
                {openingId === hotel.tjHotelId && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
                    <Loader2 className="h-8 w-8 animate-spin text-[#006CE4]" />
                  </div>
                )}
                <TripJackHotelGridCard
                  hotel={hotel}
                  locale={locale}
                  onViewDetails={() => void onViewDetails(hotel)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!search.loading && search.error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {search.error}
        </p>
      )}
    </div>
  );
}
