"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import { HOTEL_SORT_KEYS, type CatalogSortKey } from "@/lib/catalog/sort";
import { TripJackHotelGridCard } from "@/components/hotels-tripjack/tripjack-hotel-grid-card";
import { TripJackResultsGridSkeleton } from "@/components/hotels-tripjack/tripjack-hotel-grid-skeleton";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { TripJackSearchPanel } from "@/components/hotels-tripjack/tripjack-search-panel";
import {
  extractCityFromLocation,
  TripJackResultsFilters,
  type TripJackResultsFilterState,
} from "@/components/hotels-tripjack/tripjack-results-filters";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { useTripJackHotelSearch } from "@/hooks/use-tripjack-hotel-search";
import { explainHotelImageResolution } from "@/lib/tripjack-hotels/hotel-images";
import { loadHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { HotelListingSearchParams, NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toggleFilterId } from "@/lib/catalog/budget-filters";

function sortTripJackHotels(hotels: NormalizedHotel[], sortKey: CatalogSortKey): NormalizedHotel[] {
  const list = [...hotels];
  switch (sortKey) {
    case "price_asc":
      return list.sort((a, b) => a.cheapestTotalPrice - b.cheapestTotalPrice);
    case "price_desc":
      return list.sort((a, b) => b.cheapestTotalPrice - a.cheapestTotalPrice);
    case "rating_desc":
      return list.sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0));
    case "name_asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return list;
  }
}

function ResultsSearchBar({
  request,
  onSearchSuccess,
  onLoadingChange,
}: {
  request: HotelListingSearchParams;
  onSearchSuccess: () => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const search = useTripJackHotelSearch({
    initialDestination: request.destinationLabel ?? request.destination ?? "",
    initialParams: request,
    redirectToResults: false,
    onSearchSuccess,
  });

  useEffect(() => {
    onLoadingChange(search.loading);
  }, [search.loading, onLoadingChange]);

  return (
    <TripJackSearchPanel
      {...search}
      variant="compact"
      onSearch={() => void search.onSearch()}
    />
  );
}

export function HotelResultsClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;
  const [debugOpen, setDebugOpen] = useState(false);

  const [ready, setReady] = useState(false);
  const [sessionRequest, setSessionRequest] = useState<HotelListingSearchParams | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [contextLabel, setContextLabel] = useState("");
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  const [filters, setFilters] = useState<TripJackResultsFilterState>({
    nameQuery: "",
    priceRange: [0, 50000],
    selectedCities: [],
    minStars: [],
    refundableOnly: false,
    breakfastOnly: false,
  });

  const reloadFromSession = useCallback(() => {
    const session = loadHotelListingSession();
    if (!session.hotels.length || !session.correlationId) {
      router.replace("/hotels/search");
      return false;
    }
    setHotels(session.hotels);
    setTotalResults(session.totalResults);
    if (session.request) {
      setSessionRequest(session.request);
    }
    const ctx = session.searchContext as {
      destinationLabel?: string;
      destination?: string;
      checkIn?: string;
      checkOut?: string;
    } | null;
    if (ctx) {
      const parts = [
        ctx.destinationLabel || ctx.destination,
        ctx.checkIn && ctx.checkOut ? `${ctx.checkIn} → ${ctx.checkOut}` : "",
      ].filter(Boolean);
      setContextLabel(parts.join(" · "));
    }
    return true;
  }, [router]);

  useEffect(() => {
    if (reloadFromSession()) {
      setReady(true);
    }
  }, [reloadFromSession]);

  const maxPrice = useMemo(
    () => Math.max(...hotels.map((h) => h.cheapestTotalPrice), 1000),
    [hotels]
  );

  useEffect(() => {
    setFilters((prev) => ({ ...prev, priceRange: [0, maxPrice] }));
  }, [maxPrice]);

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const hotel of hotels) {
      const city = extractCityFromLocation(hotel.location);
      if (city) cities.add(city);
    }
    return [...cities]
      .sort((a, b) => a.localeCompare(b))
      .map((city) => ({ id: city, label: city }));
  }, [hotels]);

  const handleSearchSuccess = useCallback(() => {
    reloadFromSession();
    setSearchLoading(false);
    setFilters({
      nameQuery: "",
      priceRange: [0, maxPrice],
      selectedCities: [],
      minStars: [],
      refundableOnly: false,
      breakfastOnly: false,
    });
    setSortBy("price_asc");
  }, [maxPrice, reloadFromSession]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.nameQuery.trim()) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    if (filters.selectedCities.length > 0) count++;
    if (filters.minStars.length > 0) count++;
    if (filters.refundableOnly) count++;
    if (filters.breakfastOnly) count++;
    return count;
  }, [filters, maxPrice]);

  const clearFilters = useCallback(() => {
    setFilters({
      nameQuery: "",
      priceRange: [0, maxPrice],
      selectedCities: [],
      minStars: [],
      refundableOnly: false,
      breakfastOnly: false,
    });
    setSortBy("price_asc");
  }, [maxPrice]);

  const filtered = useMemo(() => {
    const starMin =
      filters.minStars.length > 0 ? Math.min(...filters.minStars.map(Number)) : 0;
    const q = filters.nameQuery.trim().toLowerCase();

    let list = hotels.filter((hotel) => {
      const city = extractCityFromLocation(hotel.location);
      const matchName = !q || hotel.name.toLowerCase().includes(q);
      const matchCity =
        filters.selectedCities.length === 0 || filters.selectedCities.includes(city);
      const matchPrice =
        hotel.cheapestTotalPrice >= filters.priceRange[0] &&
        hotel.cheapestTotalPrice <= filters.priceRange[1];
      const matchStars = starMin === 0 || (hotel.starRating ?? 0) >= starMin;
      const matchRefundable = !filters.refundableOnly || hotel.isRefundable;
      const matchBreakfast = !filters.breakfastOnly || hotel.hasBreakfast;
      return matchName && matchCity && matchPrice && matchStars && matchRefundable && matchBreakfast;
    });

    list = sortTripJackHotels(list, sortBy);
    return list;
  }, [hotels, filters, sortBy]);

  const onViewDetails = (hotel: NormalizedHotel) => {
    router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
  };

  if (!ready) {
    return (
      <HotelBookingLayout maxWidth="full" title="Live hotel results">
        <TripJackResultsGridSkeleton count={6} />
      </HotelBookingLayout>
    );
  }

  const destinationTitle = contextLabel.split(" · ")[0] || "Hotels";

  return (
    <HotelBookingLayout
      title={`${destinationTitle} — ${totalResults} live hotels`}
      subtitle={contextLabel}
      backHref="/hotels"
      backLabel="All hotels"
      maxWidth="full"
    >
      <div className="mb-8">
        {sessionRequest && (
          <ResultsSearchBar
            request={sessionRequest}
            onSearchSuccess={handleSearchSuccess}
            onLoadingChange={setSearchLoading}
          />
        )}
      </div>

      {searchLoading && (
        <div className="mb-6">
          <TripJackResultsGridSkeleton count={6} />
        </div>
      )}

      {!searchLoading && (
        <ListingLayout
          filterSidebar={
            <TripJackResultsFilters
              maxPrice={maxPrice}
              cityOptions={cityOptions}
              filters={filters}
              onNameQueryChange={(value) =>
                setFilters((prev) => ({ ...prev, nameQuery: value }))
              }
              onPriceChange={(priceRange) => setFilters((prev) => ({ ...prev, priceRange }))}
              onCityToggle={(cityId) =>
                setFilters((prev) => ({
                  ...prev,
                  selectedCities: toggleFilterId(prev.selectedCities, cityId),
                }))
              }
              onStarToggle={(starId) =>
                setFilters((prev) => ({
                  ...prev,
                  minStars: prev.minStars.includes(starId)
                    ? prev.minStars.filter((s) => s !== starId)
                    : [starId],
                }))
              }
              onRefundableChange={(refundableOnly) =>
                setFilters((prev) => ({ ...prev, refundableOnly }))
              }
              onBreakfastChange={(breakfastOnly) =>
                setFilters((prev) => ({ ...prev, breakfastOnly }))
              }
              onClear={clearFilters}
              hasActiveFilters={activeFilterCount > 0}
            />
          }
          mobileFilterPanel={
            <TripJackResultsFilters
              embedded
              maxPrice={maxPrice}
              cityOptions={cityOptions}
              filters={filters}
              onNameQueryChange={(value) =>
                setFilters((prev) => ({ ...prev, nameQuery: value }))
              }
              onPriceChange={(priceRange) => setFilters((prev) => ({ ...prev, priceRange }))}
              onCityToggle={(cityId) =>
                setFilters((prev) => ({
                  ...prev,
                  selectedCities: toggleFilterId(prev.selectedCities, cityId),
                }))
              }
              onStarToggle={(starId) =>
                setFilters((prev) => ({
                  ...prev,
                  minStars: prev.minStars.includes(starId)
                    ? prev.minStars.filter((s) => s !== starId)
                    : [starId],
                }))
              }
              onRefundableChange={(refundableOnly) =>
                setFilters((prev) => ({ ...prev, refundableOnly }))
              }
              onBreakfastChange={(breakfastOnly) =>
                setFilters((prev) => ({ ...prev, breakfastOnly }))
              }
              onClear={clearFilters}
              hasActiveFilters={activeFilterCount > 0}
            />
          }
          sortKeys={HOTEL_SORT_KEYS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          activeFilterCount={activeFilterCount}
          resultCount={filtered.length}
        >
          {filtered.length === 0 ? (
            <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-sm">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-[#0c2444]">No hotels match your filters</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another city or date, or clear filters to see all results.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
                <Button onClick={() => router.push("/hotels/search")}>
                  <Search className="mr-2 h-4 w-4" />
                  New search
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((hotel) => (
                <TripJackHotelGridCard
                  key={String(hotel.tjHotelId)}
                  hotel={hotel}
                  locale={locale}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          )}

          {isSuperAdmin && hotels.length > 0 && (
            <div className="mt-8 rounded border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setDebugOpen((open) => !open)}
              >
                {debugOpen ? "Hide" : "Show"} image debug (Super Admin)
              </button>
              {debugOpen && (() => {
                const sample = hotels[0];
                const debug = explainHotelImageResolution(sample);
                return (
                  <div className="mt-3 space-y-2 font-mono">
                    <p>
                      <strong>Hotel:</strong> {sample.name} (HID {String(sample.tjHotelId)})
                    </p>
                    <p>
                      <strong>heroImage:</strong> {debug.heroImage ?? "—"}
                    </p>
                    <p>
                      <strong>selected URL:</strong> {debug.selectedUrl ?? "NO IMAGE"}
                    </p>
                    <p>
                      <strong>imageUrls:</strong> {debug.imageUrls?.join(", ") || "—"}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </ListingLayout>
      )}
    </HotelBookingLayout>
  );
}
