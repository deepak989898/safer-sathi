"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Bus, Clock, MapPin } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { BusRoute } from "@/types";
import { cn } from "@/lib/utils";

export default function BusBookingClient({
  initialRoutes,
}: {
  initialRoutes: BusRoute[];
}) {
  const { locale } = useAppStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  const filtered = useMemo(() => {
    return initialRoutes.filter((r) => {
      const matchFrom = !from || r.from.toLowerCase().includes(from.toLowerCase());
      const matchTo = !to || r.to.toLowerCase().includes(to.toLowerCase());
      return matchFrom && matchTo;
    });
  }, [initialRoutes, from, to]);

  const toggleSeat = (seat: number) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const seatGrid = selectedRoute
    ? Array.from({ length: selectedRoute.totalSeats }, (_, i) => i + 1)
    : [];

  return (
    <>
      <PageHero
        title="Bus Booking"
        subtitle="Comfortable AC and sleeper buses across India"
        image={HERO_IMAGES.bus}
      />

      <section className="container mx-auto px-4 py-10">
        <Card className="mb-8">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
            <div>
              <Label>From</Label>
              <Input
                placeholder="Delhi"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                placeholder="Jaipur"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1.5" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Search Buses</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {filtered.map((route) => (
              <Card
                key={route.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedRoute?.id === route.id && "ring-2 ring-primary"
                )}
                onClick={() => {
                  setSelectedRoute(route);
                  setSelectedSeats([]);
                }}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bus className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{route.operator}</p>
                      <p className="text-sm text-muted-foreground">{route.busType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{route.departureTime}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{route.arrivalTime}</span>
                    <Badge variant="secondary">{route.duration}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {route.from} → {route.to}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(route.price, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {route.seatsAvailable} seats left
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedRoute && (
            <Card className="h-fit lg:sticky lg:top-24">
              <CardContent className="pt-6">
                <h3 className="font-semibold">Select Seats</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRoute.from} → {selectedRoute.to}
                </p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {seatGrid.map((seat) => {
                    const booked = seat > selectedRoute.seatsAvailable;
                    return (
                      <button
                        key={seat}
                        type="button"
                        disabled={booked}
                        onClick={() => toggleSeat(seat)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-xs transition-colors",
                          booked && "cursor-not-allowed bg-muted text-muted-foreground",
                          !booked &&
                            selectedSeats.includes(seat) &&
                            "border-primary bg-primary text-primary-foreground",
                          !booked &&
                            !selectedSeats.includes(seat) &&
                            "hover:border-primary"
                        )}
                      >
                        {seat}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {selectedRoute.amenities.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span>{selectedSeats.length} seat(s)</span>
                    <span>
                      {formatCurrency(selectedRoute.price * selectedSeats.length, locale)}
                    </span>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={selectedSeats.length === 0}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Proceed to Book
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
