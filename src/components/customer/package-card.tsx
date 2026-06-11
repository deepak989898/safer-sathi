import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { RatingStars } from "@/components/customer/rating-stars";
import type { Locale, TourPackage } from "@/types";
import { formatCurrency, localizedText, t } from "@/lib/i18n";

export function PackageCard({
  pkg,
  locale,
}: {
  pkg: TourPackage;
  locale: Locale;
}) {
  return (
    <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <SafeImage
          src={pkg.images[0]}
          alt={localizedText(pkg.title, locale)}
          fill
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {pkg.featured && (
          <Badge className="absolute left-3 top-3 bg-primary">Featured</Badge>
        )}
        {pkg.originalPrice && (
          <Badge variant="secondary" className="absolute right-3 top-3">
            Save {formatCurrency(pkg.originalPrice - pkg.price, locale)}
          </Badge>
        )}
      </div>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {localizedText(pkg.title, locale)}
          </h3>
          <RatingStars rating={pkg.rating} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {localizedText(pkg.durationLabel, locale)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {pkg.cities.slice(0, 2).join(", ")}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {localizedText(pkg.description, locale)}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-transparent">
        <div>
          <p className="text-xs text-muted-foreground">{t(locale, "common", "from")}</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(pkg.price, locale)}
          </p>
        </div>
        <Link href={`/packages/${pkg.slug}`}>
          <Button>{t(locale, "common", "viewDetails")}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
