"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Calendar, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingStars } from "@/components/customer/rating-stars";
import { useAppStore, useBookingCart } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Hotel } from "@/types";

export function HotelDetailClient({ hotel }: { hotel: Hotel }) {
  const { locale } = useAppStore();
  const setCart = useBookingCart((s) => s.setCart);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1;

  const total = hotel.priceFrom * nights;

  const handleBook = () => {
    setCart({
      serviceType: "hotel",
      serviceId: hotel.id,
      serviceName: localizedText(hotel.name, locale),
      startDate: checkIn,
      endDate: checkOut,
      guests: Number(guests),
      amount: total,
    });
  };

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
            <SafeImage
              src={hotel.images[0]}
              alt={localizedText(hotel.name, locale)}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">
                  {localizedText(hotel.name, locale)}
                </h1>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {hotel.location}, {hotel.city}
                </p>
              </div>
              <RatingStars rating={hotel.rating} reviewCount={hotel.reviewCount} />
            </div>
            <Badge className="mt-3">
              <Star className="mr-1 h-3 w-3 fill-current" />
              {hotel.starRating} Star Hotel
            </Badge>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              {localizedText(hotel.description, locale)}
            </p>
            <div className="mt-6">
              <h3 className="font-semibold">Amenities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {hotel.amenities.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
            {hotel.rooms.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold">Rooms</h3>
                <div className="mt-3 space-y-3">
                  {hotel.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{localizedText(room.name, locale)}</p>
                        <p className="text-sm text-muted-foreground">
                          Up to {room.maxGuests} guests
                        </p>
                      </div>
                      <p className="font-semibold text-primary">
                        {formatCurrency(room.pricePerNight, locale)}/night
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {formatCurrency(hotel.priceFrom, locale)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {t(locale, "common", "perNight")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t(locale, "hero", "checkIn")}</Label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(locale, "hero", "checkOut")}</Label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t(locale, "hero", "guests")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span>
                    {formatCurrency(hotel.priceFrom, locale)} × {nights} nights
                  </span>
                  <span>{formatCurrency(total, locale)}</span>
                </div>
                <div className="mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total, locale)}</span>
                </div>
              </div>
              <Link href="/booking" onClick={handleBook}>
                <Button className="w-full" size="lg" disabled={!checkIn || !checkOut}>
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
