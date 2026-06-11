"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingStars } from "@/components/customer/rating-stars";
import { useAppStore, useBookingCart } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { TourPackage } from "@/types";

export function PackageDetailClient({ pkg }: { pkg: TourPackage }) {
  const { locale } = useAppStore();
  const setCart = useBookingCart((s) => s.setCart);
  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState("2");
  const total = pkg.price * Number(guests || 1);

  const handleBook = () => {
    setCart({
      serviceType: "package",
      serviceId: pkg.id,
      serviceName: localizedText(pkg.title, locale),
      startDate,
      endDate: "",
      guests: Number(guests),
      amount: total,
    });
  };

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
            <Image
              src={pkg.images[0]}
              alt={localizedText(pkg.title, locale)}
              fill
              className="object-cover"
              priority
            />
            {pkg.featured && (
              <Badge className="absolute left-4 top-4">Featured</Badge>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">
                  {localizedText(pkg.title, locale)}
                </h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {localizedText(pkg.durationLabel, locale)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {pkg.cities.join(" → ")}
                  </span>
                </div>
              </div>
              <RatingStars rating={pkg.rating} reviewCount={pkg.reviewCount} />
            </div>
            <Badge className="mt-3 capitalize">{pkg.category}</Badge>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
              <TabsTrigger value="inclusions">Inclusions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <p className="leading-relaxed text-muted-foreground">
                {localizedText(pkg.description, locale)}
              </p>
              <div>
                <h3 className="font-semibold">Activities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pkg.activities.map((a) => (
                    <Badge key={a} variant="secondary">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Hotels</h3>
                <ul className="mt-2 list-inside list-disc text-muted-foreground">
                  {pkg.hotels.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="itinerary" className="mt-4 space-y-4">
              {pkg.itinerary.length === 0 ? (
                <p className="text-muted-foreground">Detailed itinerary coming soon.</p>
              ) : (
                pkg.itinerary.map((day) => (
                  <div key={day.day} className="rounded-lg border p-4">
                    <h4 className="font-semibold text-primary">
                      Day {day.day}: {localizedText(day.title, locale)}
                    </h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {localizedText(day.description, locale)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {day.activities.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="inclusions" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-semibold text-green-700 dark:text-green-400">
                    Included
                  </h3>
                  <ul className="space-y-2">
                    {pkg.inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {localizedText(item, locale)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-semibold text-red-700 dark:text-red-400">
                    Not Included
                  </h3>
                  <ul className="space-y-2">
                    {pkg.exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        {localizedText(item, locale)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {formatCurrency(pkg.price, locale)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / person
                </span>
              </CardTitle>
              {pkg.originalPrice && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatCurrency(pkg.originalPrice, locale)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Travel Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total, locale)}</span>
                </div>
              </div>
              <Link href="/booking" onClick={handleBook}>
                <Button className="w-full" size="lg" disabled={!startDate}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {t(locale, "common", "bookNow")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
