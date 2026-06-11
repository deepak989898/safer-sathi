"use client";

import { useState } from "react";
import { DetailPageHeader } from "@/components/customer/detail-page-header";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { useGoToBooking } from "@/hooks/use-go-to-booking";
import { Calendar, Check, Fuel, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingStars } from "@/components/customer/rating-stars";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Vehicle } from "@/types";

export function VehicleDetailClient({ vehicle }: { vehicle: Vehicle }) {
  const { locale } = useAppStore();
  const goToBooking = useGoToBooking();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState("1");

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1;

  const total = vehicle.pricePerDay * days;

  const handleBook = () => {
    goToBooking({
      serviceType: "vehicle",
      serviceId: vehicle.id,
      serviceName: localizedText(vehicle.name, locale),
      startDate,
      endDate,
      guests: Number(guests),
      amount: total,
    });
  };

  return (
    <>
      <DetailPageHeader
        title={localizedText(vehicle.name, locale)}
        backHref="/vehicles"
        backLabel="Back to Vehicles"
      />
      <section className="container mx-auto px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
            <ImageAutoSlider
              images={vehicle.images}
              alt={localizedText(vehicle.name, locale)}
              sizes="100vw"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">
                  {localizedText(vehicle.name, locale)}
                </h1>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {vehicle.location}
                </p>
              </div>
              <RatingStars rating={vehicle.rating} reviewCount={vehicle.reviewCount} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {vehicle.type.replace("_", " ")}
              </Badge>
              <Badge variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                {vehicle.seats} seats
              </Badge>
              <Badge variant="secondary">
                <Fuel className="mr-1 h-3 w-3" />
                {vehicle.fuelType}
              </Badge>
              {vehicle.driverIncluded && (
                <Badge>Driver Included</Badge>
              )}
            </div>

            <p className="mt-6 leading-relaxed text-muted-foreground">
              {localizedText(vehicle.description, locale)}
            </p>

            <div className="mt-6">
              <h3 className="font-semibold">Features</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {vehicle.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span>{formatCurrency(vehicle.pricePerDay, locale)}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  / {t(locale, "common", "perDay")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pick-up Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Return Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Passengers</Label>
                <Input
                  type="number"
                  min={1}
                  max={vehicle.seats}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span>
                    {formatCurrency(vehicle.pricePerDay, locale)} × {days} days
                  </span>
                  <span>{formatCurrency(total, locale)}</span>
                </div>
                <div className="mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total, locale)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!startDate || !endDate}
                onClick={handleBook}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {t(locale, "common", "bookNow")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </section>
    </>
  );
}
