"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { CatalogPagination } from "@/components/customer/catalog-pagination";
import { RatingStars } from "@/components/customer/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TripJackHotelCardMedia } from "@/components/hotels-tripjack/tripjack-hotel-card-media";
import { HotelCardLocation } from "@/components/hotels-tripjack/hotel-card-location";
import { TripJackDatePriceStrip } from "@/components/hotels-tripjack/tripjack-date-price-strip";
import { TripJackQuickSearchBar, type TripJackQuickSearchBarHandle } from "@/components/hotels-tripjack/tripjack-quick-search-bar";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";
import { FEATURED_POPULAR_CITIES } from "@/lib/tripjack-hotels/catalog-location";
import { bootstrapFeaturedTripJackHotel } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import { useHotelLiveDatePrices, hotelHasLivePrice } from "@/hooks/use-hotel-live-date-prices";
import { formatCurrency, t } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { Locale } from "@/types";
import { toast } from "sonner";

function FeaturedTripJackCard({
  hotel,
  locale,
  livePrice,
  priceLoading,
}: {
  hotel: FeaturedTripJackHotelCard;
  locale: Locale;
  livePrice?: { price: number; currency: string } | null;
  priceLoading?: boolean;
}) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const stars =
    hotel.starRating && hotel.starRating > 0 ? Math.min(5, Math.round(hotel.starRating)) : 0;

  const openHotel = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const result = await bootstrapFeaturedTripJackHotel({
        tjHotelId: hotel.tjHotelId,
        hotelName: hotel.name,
        cityName: hotel.cityName,
        location: hotel.location,
        heroImage: hotel.heroImage,
        imageUrls: hotel.imageUrls,
        starRating: hotel.starRating,
        facilities: hotel.facilities,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
    } finally {
      setBooking(false);
    }
  };

  return (
    <Card className="group/card overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <button type="button" onClick={() => void openHotel()} className="block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <TripJackHotelCardMedia
            alt={hotel.imageCaption || hotel.name}
            heroImage={hotel.heroImage}
            imageUrls={hotel.imageUrls}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
          {stars > 0 && (
            <Badge className="absolute left-3 top-3 z-10 bg-white/95 text-slate-900 hover:bg-white/95">
              <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
              {stars} Star
            </Badge>
          )}
        </div>
      </button>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => void openHotel()} className="text-left hover:text-primary">
            <h3 className="line-clamp-2 font-semibold leading-snug">{hotel.name}</h3>
          </button>
          {hotel.starRating && hotel.starRating > 0 ? (
            <RatingStars rating={hotel.starRating} />
          ) : null}
        </div>
        <HotelCardLocation location={hotel.location} />
        {hotel.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.facilities.slice(0, 3).map((facility) => (
              <Badge key={facility} variant="secondary" className="text-xs">
                {facility}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          {priceLoading ? (
            <p className="text-sm text-muted-foreground">Loading price…</p>
          ) : livePrice && livePrice.price > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">{t(locale, "common", "from")}</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(livePrice.price, locale)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {t(locale, "common", "perNight")}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Check live price</p>
          )}
        </div>
        <Button variant="outline" disabled={booking} onClick={() => void openHotel()}>
          {booking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            "View rooms & book"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function FeaturedHotelsSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden pt-0">
          <div className="aspect-[4/3] animate-pulse bg-slate-200" />
          <CardContent className="space-y-3 pt-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          </CardContent>
          <CardFooter>
            <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export interface FeaturedCityFilterCounts {
  totalHotels: number;
  cities: Array<{ city: string; key: string; count: number }>;
}

const OTHER_CITIES_KEY = "other";

export interface FeaturedTripJackCatalogInfo {
  contentSyncedCount?: number;
  totalActiveHotels?: number;
  syncInProgress?: boolean;
  contentSuccessCount?: number;
  filterCounts?: FeaturedCityFilterCounts | null;
}

export function FeaturedTripJackHotelsSection({
  hotels,
  loading = false,
  catalogInfo,
}: {
  hotels: FeaturedTripJackHotelCard[];
  loading?: boolean;
  catalogInfo?: FeaturedTripJackCatalogInfo | null;
}) {
  const { locale } = useAppStore();
  const searchBarRef = useRef<TripJackQuickSearchBarHandle>(null);
  const [activeCity, setActiveCity] = useState<string>("all");
  const [cityPage, setCityPage] = useState(1);
  const [cityHotels, setCityHotels] = useState<FeaturedTripJackHotelCard[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityTotalCount, setCityTotalCount] = useState(0);
  const [cityTotalPages, setCityTotalPages] = useState(1);
  const [filterCounts, setFilterCounts] = useState<FeaturedCityFilterCounts | null>(
    catalogInfo?.filterCounts ?? null
  );
  const [filterCountsLoading, setFilterCountsLoading] = useState(!catalogInfo?.filterCounts);

  useEffect(() => {
    if (catalogInfo?.filterCounts) {
      setFilterCounts(catalogInfo.filterCounts);
      setFilterCountsLoading(false);
    }
  }, [catalogInfo?.filterCounts]);

  useEffect(() => {
    if (filterCounts || !hotels.length) return;
    let cancelled = false;
    setFilterCountsLoading(true);
    void fetch("/api/hotels/featured-city-counts", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        setFilterCounts(json.data ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFilterCountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterCounts, hotels.length]);

  const isOtherCities = activeCity === OTHER_CITIES_KEY;
  const isCityFilter = activeCity !== "all" && !isOtherCities;
  const pageSize = 20;

  const fetchCityHotels = useCallback(async (cityKey: string, page: number) => {
    setCityLoading(true);
    try {
      const params = new URLSearchParams({
        city: cityKey,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/hotels/featured-city-hotels?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) {
        setCityHotels([]);
        setCityTotalCount(0);
        setCityTotalPages(1);
        return;
      }
      setCityHotels(json.data?.hotels ?? []);
      setCityTotalCount(json.data?.totalCount ?? 0);
      setCityTotalPages(json.data?.totalPages ?? 1);
    } catch {
      setCityHotels([]);
      setCityTotalCount(0);
      setCityTotalPages(1);
    } finally {
      setCityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCityFilter) {
      setCityHotels([]);
      setCityTotalCount(0);
      setCityTotalPages(1);
      setCityLoading(false);
      return;
    }
    void fetchCityHotels(activeCity, cityPage);
  }, [activeCity, cityPage, isCityFilter, fetchCityHotels]);

  const handleCitySelect = (cityKey: string) => {
    if (cityKey === OTHER_CITIES_KEY) {
      setActiveCity(OTHER_CITIES_KEY);
      setCityPage(1);
      window.requestAnimationFrame(() => {
        searchBarRef.current?.focusDestination();
      });
      return;
    }
    setActiveCity(cityKey);
    setCityPage(1);
  };

  const displayedHotels = isCityFilter ? cityHotels : isOtherCities ? [] : hotels;
  const showFullGridSkeleton = (isCityFilter ? cityLoading : loading) && displayedHotels.length === 0;
  const showPartialGridSkeleton = isCityFilter && cityLoading && displayedHotels.length > 0;

  const priceHotelIds = useMemo(
    () => displayedHotels.map((hotel) => hotel.tjHotelId),
    [displayedHotels]
  );

  const {
    stayDates,
    selectedCheckIn,
    setSelectedCheckIn,
    selectedPrices,
    selectedPricesReady,
    selectedLoading,
  } = useHotelLiveDatePrices(
    priceHotelIds,
    displayedHotels.length > 0 && !showFullGridSkeleton
  );

  const pricedHotels = useMemo(() => {
    if (isOtherCities || !displayedHotels.length) return [];
    if (!selectedPricesReady) return [];
    return displayedHotels.filter((hotel) => hotelHasLivePrice(selectedPrices, hotel.tjHotelId));
  }, [displayedHotels, isOtherCities, selectedPrices, selectedPricesReady]);

  const awaitingLivePrices =
    !isOtherCities && displayedHotels.length > 0 && !selectedPricesReady;
  const showPriceLoadingSkeleton = awaitingLivePrices || selectedLoading;
  const gridShowsSkeleton = showFullGridSkeleton || showPriceLoadingSkeleton;

  const allCitiesCount =
    filterCounts?.totalHotels ?? catalogInfo?.contentSyncedCount ?? hotels.length;
  const allCitiesLabel = filterCountsLoading
    ? `All cities (${hotels.length > 0 ? `${hotels.length}+` : "…"})`
    : `All cities (${allCitiesCount.toLocaleString()})`;

  const sidebarCities = useMemo(() => {
    if (filterCounts?.cities?.length) {
      return filterCounts.cities;
    }
    return FEATURED_POPULAR_CITIES.map((city) => ({
      city,
      key: city.toLowerCase(),
      count: 0,
    })).filter((item) => item.count > 0);
  }, [filterCounts]);

  const cityStartIndex = cityTotalCount === 0 ? 0 : (cityPage - 1) * pageSize + 1;
  const cityEndIndex = Math.min(cityPage * pageSize, cityTotalCount);

  const syncMessage = useMemo(() => {
    if ((loading && hotels.length === 0) || hotels.length > 0) return null;
    const ready = catalogInfo?.contentSyncedCount ?? catalogInfo?.contentSuccessCount ?? 0;
    const total = catalogInfo?.totalActiveHotels ?? 0;
    if (ready > 0) {
      return `${ready.toLocaleString()} hotels are synced in the catalog${
        total > ready ? ` (${total.toLocaleString()} mapping IDs total)` : ""
      }. Search below or browse all hotels for more stays.`;
    }
    if (catalogInfo?.syncInProgress) {
      return `Hotel catalog sync is running. Featured hotels will appear here as content sync completes.`;
    }
    return "Featured hotels will appear here after catalog content sync completes.";
  }, [loading, hotels.length, catalogInfo]);

  return (
    <section className="mb-10">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0c2444] md:text-2xl">Featured hotels in India</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hotels.length > 0
                ? "Handpicked stays with photos and live rates — open any hotel to view rooms and book."
                : "Popular Indian destinations with live availability — search below for more."}
            </p>
          </div>
          <Link href="/hotels/browse">
            <Button variant="outline">View all hotels</Button>
          </Link>
        </div>

        <TripJackQuickSearchBar ref={searchBarRef} />

        {hotels.length > 0 ? (
          <TripJackDatePriceStrip
            dates={stayDates}
            selectedCheckIn={selectedCheckIn}
            onSelect={setSelectedCheckIn}
            locale={locale}
          />
        ) : null}
      </div>

      {!loading && hotels.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-6 text-sm text-amber-950">
          <p>{syncMessage}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Filter by city</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleCitySelect("all")}
                disabled={loading && hotels.length === 0}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeCity === "all"
                    ? "bg-[#eaf2ff] font-semibold text-[#0f4aa8]"
                    : "hover:bg-slate-50"
                }`}
              >
                {allCitiesLabel}
              </button>
              {sidebarCities.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleCitySelect(item.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeCity === item.key
                      ? "bg-[#eaf2ff] font-semibold text-[#0f4aa8]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {item.city} ({item.count.toLocaleString()})
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCitySelect(OTHER_CITIES_KEY)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  isOtherCities
                    ? "bg-[#eaf2ff] font-semibold text-[#0f4aa8]"
                    : "hover:bg-slate-50"
                }`}
              >
                Other cities
              </button>
            </div>
          </aside>

          {gridShowsSkeleton ? (
            <FeaturedHotelsSkeleton />
          ) : (
            <div>
              {isCityFilter ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  {pricedHotels.length.toLocaleString()} hotel{pricedHotels.length === 1 ? "" : "s"}{" "}
                  with live rates in{" "}
                  {sidebarCities.find((c) => c.key === activeCity)?.city ?? activeCity}
                </p>
              ) : null}
              {isOtherCities ? (
                <div className="rounded-xl border border-dashed bg-slate-50/80 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Search any city or hotel</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use the search box above to find stays in other destinations across India.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => searchBarRef.current?.focusDestination()}
                  >
                    Go to search
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {pricedHotels.map((hotel) => (
                      <FeaturedTripJackCard
                        key={hotel.tjHotelId}
                        hotel={hotel}
                        locale={locale}
                        livePrice={selectedPrices[String(hotel.tjHotelId)]}
                        priceLoading={false}
                      />
                    ))}
                    {pricedHotels.length === 0 && selectedPricesReady && (
                      <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No hotels with live rates for the selected date. Try another date above or
                        search for more stays.
                      </p>
                    )}
                  </div>
                  {showPartialGridSkeleton ? (
                    <div className="mt-6">
                      <FeaturedHotelsSkeleton count={3} />
                    </div>
                  ) : null}
                </>
              )}
              {isCityFilter && cityTotalCount > 0 ? (
                <div className="mt-8">
                  <CatalogPagination
                    page={cityPage}
                    totalPages={cityTotalPages}
                    total={cityTotalCount}
                    startIndex={cityStartIndex}
                    endIndex={cityEndIndex}
                    onPageChange={setCityPage}
                  />
                </div>
              ) : null}
              {!isCityFilter && !isOtherCities && hotels.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <Link href="/hotels/browse">
                    <Button className="bg-[#1a4fa3] hover:bg-[#16408a]">View more live hotels</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
