"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageHeader } from "@/components/customer/detail-page-header";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { Calendar, Check, Fuel, Loader2, MapPin, Route, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/customer/rating-stars";
import { useAuth } from "@/contexts/auth-context";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Vehicle } from "@/types";
import { toast } from "sonner";

const MIN_KM = 50;

export function VehicleDetailClient({ vehicle }: { vehicle: Vehicle }) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const [bookingMode, setBookingMode] = useState<"day" | "km">("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState("1");
  const [distanceKm, setDistanceKm] = useState(String(MIN_KM));
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [specialRequest, setSpecialRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pricePerKm = vehicle.pricePerKm ?? Math.round(vehicle.pricePerDay / 200);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 1;
    return Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }, [startDate, endDate]);

  const km = Math.max(MIN_KM, Number(distanceKm) || MIN_KM);
  const dayTotal = vehicle.pricePerDay * days;
  const kmTotal = pricePerKm * km;
  const total = bookingMode === "km" ? kmTotal : dayTotal;

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill name, email and phone");
      return;
    }
    if (!canBook) {
      toast.error("Please complete booking dates and details");
      return;
    }

    setSubmitting(true);
    try {
      const title = localizedText(vehicle.name, locale);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          serviceType: "vehicle",
          serviceId: vehicle.id,
          serviceName: { en: title, hi: vehicle.name.hi },
          startDate: bookingMode === "km" ? startDate || new Date().toISOString().slice(0, 10) : startDate,
          endDate: bookingMode === "day" ? endDate : undefined,
          guests: Number(guests) || 1,
          amount: total,
          bookingMode,
          distanceKm: bookingMode === "km" ? km : undefined,
          userId: user?.id,
          notes: specialRequest.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Booking failed");
      toast.success("Booking saved! Continue to payment...");
      router.push(`/booking?bookingId=${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save booking");
    } finally {
      setSubmitting(false);
    }
  };

  const canBook =
    bookingMode === "day"
      ? Boolean(startDate && endDate)
      : Boolean(startDate && km >= MIN_KM);

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
                {vehicle.brand && (
                  <Badge variant="outline">{vehicle.brand}</Badge>
                )}
                <Badge variant="secondary" className="capitalize">
                  {vehicle.category ?? vehicle.type.replace("_", " ")}
                </Badge>
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  {vehicle.seats} seats
                </Badge>
                <Badge variant="secondary">
                  <Fuel className="mr-1 h-3 w-3" />
                  {vehicle.fuelType}
                </Badge>
                {vehicle.driverIncluded && <Badge>Driver Included</Badge>}
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
                <CardTitle>Book this vehicle</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(vehicle.pricePerDay, locale)} / day ·{" "}
                  {formatCurrency(pricePerKm, locale)} / km
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <Tabs
                  value={bookingMode}
                  onValueChange={(v) => setBookingMode(v as "day" | "km")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="day">Per Day</TabsTrigger>
                    <TabsTrigger value="km">Per KM</TabsTrigger>
                  </TabsList>

                  <TabsContent value="day" className="mt-4 space-y-4">
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
                  </TabsContent>

                  <TabsContent value="km" className="mt-4 space-y-4">
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
                      <Label>Total distance (km)</Label>
                      <Input
                        type="number"
                        min={MIN_KM}
                        step={10}
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Minimum {MIN_KM} km · billed at{" "}
                        {formatCurrency(pricePerKm, locale)}/km
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

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

                <div>
                  <Label>Special Request</Label>
                  <Textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    className="mt-1.5 min-h-[60px]"
                    placeholder="Pickup location, child seat, etc."
                  />
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  {bookingMode === "day" ? (
                    <div className="flex justify-between text-sm">
                      <span>
                        {formatCurrency(vehicle.pricePerDay, locale)} × {days} days
                      </span>
                      <span>{formatCurrency(dayTotal, locale)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Route className="h-3.5 w-3.5" />
                        {formatCurrency(pricePerKm, locale)} × {km} km
                      </span>
                      <span>{formatCurrency(kmTotal, locale)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total, locale)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canBook || submitting}
                  onClick={handleBook}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="mr-2 h-4 w-4" />
                  )}
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
