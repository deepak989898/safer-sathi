"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Loader2, MapPin, Search, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TripJackInlineSearchSection } from "@/components/hotels-tripjack/tripjack-inline-search";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog";
import { bootstrapFeaturedTripJackHotel } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
import { toast } from "sonner";

function FeaturedTripJackCard({ hotel }: { hotel: FeaturedTripJackHotelCard }) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const candidates = useMemo(
    () =>
      resolveHotelImageCandidates({
        heroImage: hotel.heroImage,
        imageUrls: hotel.imageUrls,
      }),
    [hotel]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageSrc = candidates[candidateIndex];
  const showImage = Boolean(imageSrc) && candidateIndex < candidates.length;
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
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={hotel.imageCaption || hotel.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setCandidateIndex((index) => index + 1)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <span className="text-xs font-medium uppercase tracking-wide">Live hotel</span>
            </div>
          )}
          <Badge className="absolute left-3 top-3 z-10 gap-1 bg-[#006CE4] hover:bg-[#006CE4]">
            <Zap className="h-3 w-3 fill-current" />
            Live TripJack Hotel
          </Badge>
          {stars > 0 && (
            <Badge variant="secondary" className="absolute right-3 top-3 z-10 bg-white/95">
              <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
              {stars} Star
            </Badge>
          )}
        </div>
      </button>
      <CardContent className="space-y-2 pt-4">
        <button type="button" onClick={() => void openHotel()} className="text-left hover:text-primary">
          <h3 className="line-clamp-2 font-semibold leading-snug">{hotel.name}</h3>
        </button>
        <p className="flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{hotel.location || hotel.cityName}</span>
        </p>
      </CardContent>
      <CardFooter className="border-t bg-transparent">
        <Button
          variant="outline"
          className="w-full"
          disabled={booking}
          onClick={() => void openHotel()}
        >
          {booking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading rates…
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
      {Array.from({ length: 6 }).map((_, index) => (
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
  const [activeCity, setActiveCity] = useState<string>("all");
  const [showLiveSearch, setShowLiveSearch] = useState(false);

  const cityOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const hotel of hotels) {
      const city = (hotel.cityName || "Other").trim();
      map.set(city, (map.get(city) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));
  }, [hotels]);

  const filteredHotels = useMemo(() => {
    if (activeCity === "all") return hotels;
    return hotels.filter((hotel) => (hotel.cityName || "Other").trim() === activeCity);
  }, [hotels, activeCity]);

  const syncMessage = useMemo(() => {
    if (loading || hotels.length > 0) return null;
    const ready = catalogInfo?.contentSyncedCount ?? catalogInfo?.contentSuccessCount ?? 0;
    const total = catalogInfo?.totalActiveHotels ?? 0;
    if (ready > 0) {
      return `${ready.toLocaleString()} synced hotels are in the catalog${
        total > ready ? ` (${total.toLocaleString()} mapping IDs total)` : ""
      }. Use search below or browse all hotels — featured cards load from Indian cities as the index updates.`;
    }
    if (catalogInfo?.syncInProgress) {
      return `Hotel catalog sync is running. Featured hotels will appear here as content sync completes${
        total > 0 ? ` (${total.toLocaleString()} mapping IDs in catalog)` : ""
      }.`;
    }
    return "Live TripJack hotels will appear here after catalog content sync completes in admin.";
  }, [loading, hotels.length, catalogInfo]);

  return (
    <section className="mb-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#006CE4]" />
            <h2 className="text-xl font-bold text-[#0c2444] md:text-2xl">
              Featured live TripJack hotels
            </h2>
          </div>
          {!showLiveSearch && (
            <p className="text-sm text-muted-foreground">
              {hotels.length > 0
                ? "Browse India hotels with photos — click any hotel to view live rooms and book."
                : "India hotels with names, cities and photos — search anytime for more destinations."}
            </p>
          )}
          {catalogInfo?.syncInProgress && hotels.length > 0 && !showLiveSearch && (
            <p className="mt-1 text-xs text-amber-700">
              Catalog sync in progress — showing featured hotels from Indian cities (
              {hotels.length} on this page
              {(catalogInfo.contentSyncedCount ?? 0) > 0
                ? ` · ${(catalogInfo.contentSyncedCount ?? 0).toLocaleString()} synced globally`
                : ""}
              ).
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showLiveSearch ? "default" : "outline"}
            className={showLiveSearch ? "bg-[#1a4fa3] hover:bg-[#16408a]" : ""}
            onClick={() => setShowLiveSearch((prev) => !prev)}
          >
            <Search className="mr-2 h-4 w-4" />
            {showLiveSearch ? "Hide search" : "Search more live hotels"}
          </Button>
          <Link href="/hotels/browse">
            <Button variant="outline">View all hotels</Button>
          </Link>
        </div>
      </div>

      {showLiveSearch && (
        <div className="mb-8">
          <TripJackInlineSearchSection />
        </div>
      )}

      {!showLiveSearch && !loading && hotels.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-6 text-sm text-amber-950">
          <p>{syncMessage}</p>
        </div>
      ) : !showLiveSearch ? (
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
              {cityOptions.map((item) => (
                <button
                  key={item.city}
                  type="button"
                  onClick={() => setActiveCity(item.city)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeCity === item.city
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
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredHotels.map((hotel) => (
                <FeaturedTripJackCard key={hotel.tjHotelId} hotel={hotel} />
              ))}
              {filteredHotels.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No featured hotels for this city right now.
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
