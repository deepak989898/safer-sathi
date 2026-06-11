import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RatingStars } from "@/components/customer/rating-stars";
import type { Hotel, Locale } from "@/types";
import { formatCurrency, localizedText, t } from "@/lib/i18n";

export function HotelCard({ hotel, locale }: { hotel: Hotel; locale: Locale }) {
  return (
    <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <SafeImage
          src={hotel.images[0]}
          alt={localizedText(hotel.name, locale)}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <Badge className="absolute left-3 top-3">
          <Star className="mr-1 h-3 w-3 fill-current" />
          {hotel.starRating} Star
        </Badge>
      </div>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{localizedText(hotel.name, locale)}</h3>
          <RatingStars rating={hotel.rating} reviewCount={hotel.reviewCount} />
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {hotel.city}, {hotel.location}
        </p>
        <div className="flex flex-wrap gap-1">
          {hotel.amenities.slice(0, 3).map((a) => (
            <Badge key={a} variant="secondary" className="text-xs">
              {a}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          <p className="text-xs text-muted-foreground">{t(locale, "common", "from")}</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(hotel.priceFrom, locale)}
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              / {t(locale, "common", "perNight")}
            </span>
          </p>
        </div>
        <Link href={`/hotels/${hotel.slug}`}>
          <Button>{t(locale, "common", "viewDetails")}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
