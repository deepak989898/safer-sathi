"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { RatingStars } from "@/components/customer/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TripJackHotelCardMedia } from "@/components/hotels-tripjack/tripjack-hotel-card-media";
import { HotelCardLocation } from "@/components/hotels-tripjack/hotel-card-location";
import { TripJackDatePriceStrip } from "@/components/hotels-tripjack/tripjack-date-price-strip";
import { TripJackQuickSearchBar } from "@/components/hotels-tripjack/tripjack-quick-search-bar";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";
import { FEATURED_POPULAR_CITIES } from "@/lib/tripjack-hotels/catalog-location";
import { bootstrapFeaturedTripJackHotel } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import { useHotelLiveDatePrices } from "@/hooks/use-hotel-live-date-prices";
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

function FeaturedHotelsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
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

export interface FeaturedTripJackCatalogInfo {
  contentSyncedCount?: number;
  totalActiveHotels?: number;
  syncInProgress?: boolean;
  contentSuccessCount?: number;
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
  const [activeCity, setActiveCity] = useState<string>("all");

  const visibleHotels = useMemo(() => {
    if (activeCity === "all") return hotels;
    return hotels.filter((hotel) => (hotel.cityKey || hotel.cityName.toLowerCase()) === activeCity);
  }, [hotels, activeCity]);

  const {
    stayDates,
    selectedCheckIn,
    setSelectedCheckIn,
    selectedPrices,
    selectedLoading,
  } = useHotelLiveDatePrices(
    hotels.map((hotel) => hotel.tjHotelId),
    !loading && hotels.length > 0
  );

  const cityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const hotel of hotels) {
      const key = hotel.cityKey || hotel.cityName.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [hotels]);

  const sidebarCities = useMemo(() => {
    return FEATURED_POPULAR_CITIES.map((city) => {
      const key = city.toLowerCase();
      return { city, key, count: cityCounts.get(key) ?? 0 };
    }).filter((item) => item.count > 0);
  }, [cityCounts]);

  const filteredHotels = visibleHotels;

  const syncMessage = useMemo(() => {
    if (loading || hotels.length > 0) return null;
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

        <TripJackQuickSearchBar />

        {!loading && hotels.length > 0 ? (
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
                onClick={() => setActiveCity("all")}
                disabled={loading || hotels.length === 0}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeCity === "all"
                    ? "bg-[#eaf2ff] font-semibold text-[#0f4aa8]"
                    : "hover:bg-slate-50"
                }`}
              >
                All cities ({hotels.length})
              </button>
              {sidebarCities.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveCity(item.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeCity === item.key
                      ? "bg-[#eaf2ff] font-semibold text-[#0f4aa8]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {item.city} ({item.count})
                </button>
              ))}
            </div>
          </aside>

          {loading ? (
            <FeaturedHotelsSkeleton />
          ) : (
            <div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredHotels.map((hotel) => (
                  <FeaturedTripJackCard
                    key={hotel.tjHotelId}
                    hotel={hotel}
                    locale={locale}
                    livePrice={selectedPrices[String(hotel.tjHotelId)]}
                    priceLoading={selectedLoading && !(String(hotel.tjHotelId) in selectedPrices)}
                  />
                ))}
                {filteredHotels.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No featured hotels for this city right now.
                  </p>
                )}
              </div>
              {hotels.length > 0 && (
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
