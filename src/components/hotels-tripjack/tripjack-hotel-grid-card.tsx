"use client";

import { MapPin, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  TripJackHotelCardMedia,
  tripJackHotelCardMediaProps,
} from "@/components/hotels-tripjack/tripjack-hotel-card-media";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface TripJackHotelGridCardProps {
  hotel: NormalizedHotel;
  locale: Locale;
  onViewDetails: (hotel: NormalizedHotel) => void;
}

export function TripJackHotelGridCard({ hotel, locale, onViewDetails }: TripJackHotelGridCardProps) {
  const stars =
    hotel.starRating && hotel.starRating > 0 ? Math.min(5, Math.round(hotel.starRating)) : 0;

  const chips: string[] = [];
  if (hotel.mealBasis) chips.push(hotel.mealBasis);
  if (hotel.hasBreakfast) chips.push("Breakfast included");
  if (hotel.isRefundable) chips.push("Refundable");

  return (
    <Card className="group/card overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onViewDetails(hotel)}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <TripJackHotelCardMedia
            {...tripJackHotelCardMediaProps(hotel)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
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
      </button>

      <CardContent className="space-y-2 pt-4">
        <button
          type="button"
          className="w-full text-left hover:text-primary"
          onClick={() => onViewDetails(hotel)}
        >
          <h3 className="line-clamp-2 font-semibold leading-snug">{hotel.name}</h3>
        </button>
        {hotel.location && (
          <p className="flex items-start gap-1 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{hotel.location}</span>
          </p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chips.slice(0, 3).map((chip) => (
              <Badge key={chip} variant="secondary" className="text-xs">
                {chip}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          {hotel.browseOnly || hotel.cheapestTotalPrice <= 0 ? (
            <p className="text-sm text-muted-foreground">Rates on next step</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(hotel.cheapestTotalPrice, locale)}
                <span className="text-xs font-normal text-muted-foreground"> / stay</span>
              </p>
            </>
          )}
        </div>
        <Button onClick={() => onViewDetails(hotel)}>
          {hotel.browseOnly ? "View hotel" : "View Rooms"}
        </Button>
      </CardFooter>
    </Card>
  );
}
