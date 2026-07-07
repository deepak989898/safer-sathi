"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, MapPin, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
import type { Locale } from "@/types";

function buildDetailHref(hotel: FeaturedTripJackHotelCard): string {
  const params = new URLSearchParams();
  if (hotel.checkIn) params.set("checkIn", hotel.checkIn);
  if (hotel.checkOut) params.set("checkOut", hotel.checkOut);
  params.set("adults", "2");
  if (hotel.cityName) params.set("city", hotel.cityName);
  const qs = params.toString();
  return `/hotels/detail/${hotel.tjHotelId}${qs ? `?${qs}` : ""}`;
}

function FeaturedLiveHotelCard({
  hotel,
  locale,
}: {
  hotel: FeaturedTripJackHotelCard;
  locale: Locale;
}) {
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
  const detailHref = buildDetailHref(hotel);

  return (
    <Card className="group/card overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <Link href={detailHref} className="block">
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
              <span className="text-xs font-medium uppercase tracking-wide">No image</span>
            </div>
          )}
          <Badge className="absolute left-3 top-3 z-10 gap-1 bg-[#006CE4] hover:bg-[#006CE4]">
            <Zap className="h-3 w-3 fill-current" />
            Live Rates
          </Badge>
          {stars > 0 && (
            <Badge variant="secondary" className="absolute right-3 top-3 z-10 bg-white/95">
              <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />
              {stars} Star
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="space-y-2 pt-4">
        <Link href={detailHref} className="hover:text-primary">
          <h3 className="line-clamp-2 font-semibold leading-snug">{hotel.name}</h3>
        </Link>
        <p className="flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{hotel.location || hotel.cityName}</span>
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          <p className="text-xs text-muted-foreground">From</p>
          <p className="text-lg font-bold text-primary">
            {hotel.cheapestTotalPrice != null
              ? formatCurrency(hotel.cheapestTotalPrice, locale)
              : "Check rates"}
            {hotel.cheapestTotalPrice != null && (
              <span className="text-xs font-normal text-muted-foreground"> / stay</span>
            )}
          </p>
        </div>
        <Link href={detailHref}>
          <Button>View Rooms</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export function FeaturedTripJackHotelsSection({
  hotels,
  locale,
}: {
  hotels: FeaturedTripJackHotelCard[];
  locale: Locale;
}) {
  if (hotels.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#006CE4]" />
            <h2 className="text-xl font-bold text-[#0c2444] md:text-2xl">
              Featured live hotels
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Popular cities with live prices — tap any hotel to view rooms instantly.
          </p>
        </div>
        <Link href="/hotels/search">
          <Button variant="outline">View more live hotels</Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hotels.map((hotel) => (
          <FeaturedLiveHotelCard key={hotel.tjHotelId} hotel={hotel} locale={locale} />
        ))}
      </div>
    </section>
  );
}
