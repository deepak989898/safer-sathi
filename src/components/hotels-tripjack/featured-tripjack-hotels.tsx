"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, MapPin, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";

function FeaturedTripJackCard({ hotel }: { hotel: FeaturedTripJackHotelCard }) {
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
  const searchHref = `/hotels/search?destination=${encodeURIComponent(hotel.cityName || hotel.name)}`;

  return (
    <Card className="group/card overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <Link href={searchHref} className="block">
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
            Live TripJack Hotel
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
        <Link href={searchHref} className="hover:text-primary">
          <h3 className="line-clamp-2 font-semibold leading-snug">{hotel.name}</h3>
        </Link>
        <p className="flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{hotel.location || hotel.cityName}</span>
        </p>
      </CardContent>
      <CardFooter className="border-t bg-transparent">
        <Link href={searchHref} className="w-full">
          <Button variant="outline" className="w-full">
            Check live rates
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export function FeaturedTripJackHotelsSection({
  hotels,
}: {
  hotels: FeaturedTripJackHotelCard[];
}) {
  if (hotels.length === 0) return null;

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
          <p className="text-sm text-muted-foreground">
            Browse synced properties with photos — search for live rates and availability.
          </p>
        </div>
        <Link href="/hotels/search">
          <Button variant="outline">View more live hotels</Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {hotels.map((hotel) => (
          <FeaturedTripJackCard key={hotel.tjHotelId} hotel={hotel} />
        ))}
      </div>
    </section>
  );
}
