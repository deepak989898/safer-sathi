import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import Link from "next/link";
import { Fuel, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RatingStars } from "@/components/customer/rating-stars";
import type { Locale, Vehicle } from "@/types";
import { formatCurrency, localizedText, t } from "@/lib/i18n";

export function VehicleCard({
  vehicle,
  locale,
}: {
  vehicle: Vehicle;
  locale: Locale;
}) {
  return (
    <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden">
        <ImageAutoSlider
          images={vehicle.images}
          alt={localizedText(vehicle.name, locale)}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <Badge
          className="absolute left-3 top-3 z-10 capitalize"
          variant={vehicle.available ? "default" : "secondary"}
        >
          {vehicle.available ? "Available" : "Booked"}
        </Badge>
      </div>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{localizedText(vehicle.name, locale)}</h3>
          <RatingStars rating={vehicle.rating} reviewCount={vehicle.reviewCount} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {vehicle.seats} seats
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" />
            {vehicle.fuelType}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {vehicle.location}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(vehicle.pricePerDay, locale)}
          </p>
          <p className="text-xs text-muted-foreground">{t(locale, "common", "perDay")}</p>
        </div>
        <Link href={`/vehicles/${vehicle.id}`}>
          <Button>{t(locale, "common", "viewDetails")}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
