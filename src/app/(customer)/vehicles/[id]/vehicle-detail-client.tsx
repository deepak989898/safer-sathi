"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import {
  Check,
  ChevronRight,
  Fuel,
  MapPin,
  Route,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CatalogDetailTabsList,
  CatalogDetailTabsTrigger,
} from "@/components/customer/catalog-detail-tabs";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/customer/rating-stars";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import { CollapsibleBookingForm } from "@/components/customer/collapsible-booking-form";
import { useAuth } from "@/contexts/auth-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import {
  postPaymentPath,
  postPaymentSuccessMessage,
} from "@/lib/bookings/post-payment-navigation";
import { calculatePayNowAmount, type PaymentPlan } from "@/lib/payments/booking-payment";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Vehicle } from "@/types";
import { CatalogViewTracker } from "@/components/seo/catalog-view-tracker";
import { trackBookingStarted } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  calculateBillableKmFromOneWay,
  getVehicleDayInclusions,
  getVehicleKmInclusions,
  VEHICLE_MIN_KM_ROUND_TRIP,
} from "@/lib/vehicles/pricing-policy";

const MIN_ONE_WAY_KM = 50;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("max-w-[58%] text-right font-medium text-[#0c2444]", className)}>
        {value}
      </span>
    </div>
  );
}

export function VehicleDetailClient({
  vehicle,
  relatedVehicles = [],
}: {
  vehicle: Vehicle;
  relatedVehicles?: Vehicle[];
}) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const { completeCatalogBooking, paying } = useTravelCheckout();
  const [bookingMode, setBookingMode] = useState<"day" | "km">("day");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(tomorrowIso);
  const [guests, setGuests] = useState("1");
  const [distanceKm, setDistanceKm] = useState(String(MIN_ONE_WAY_KM));
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [specialRequest, setSpecialRequest] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");
  const [bookingExpanded, setBookingExpanded] = useState(false);
  const submitting = paying;

  const title = localizedText(vehicle.name, locale);
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

  const oneWayKm = Math.max(MIN_ONE_WAY_KM, Number(distanceKm) || MIN_ONE_WAY_KM);
  const billableKm =
    bookingMode === "km" ? calculateBillableKmFromOneWay(oneWayKm) : 0;
  const dayTotal = vehicle.pricePerDay * days;
  const kmTotal = pricePerKm * billableKm;
  const total = bookingMode === "km" ? kmTotal : dayTotal;
  const payNow = calculatePayNowAmount(total, paymentPlan);

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill name, email and phone");
      return;
    }
    if (bookingMode === "day") {
      if (!startDate || !endDate) {
        toast.error("Please select pick-up and return dates");
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        toast.error("Return date must be on or after pick-up date");
        return;
      }
    } else if (!startDate) {
      toast.error("Please select your travel date");
      return;
    }

    try {
      trackBookingStarted("vehicle", vehicle.id, total);
      const result = await completeCatalogBooking({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        serviceType: "vehicle",
        serviceId: vehicle.id,
        serviceName: { en: title, hi: vehicle.name.hi },
        startDate:
          bookingMode === "km" ? startDate || new Date().toISOString().slice(0, 10) : startDate,
        endDate: bookingMode === "day" ? endDate : undefined,
        guests: Number(guests) || 1,
        amount: total,
        paymentPlan,
        bookingMode,
        distanceKm: bookingMode === "km" ? billableKm : undefined,
        userId: user?.id,
        notes: specialRequest.trim() || undefined,
      });
      toast.success(
        postPaymentSuccessMessage(result.booking.bookingNumber, Boolean(user))
      );
      router.push(postPaymentPath(Boolean(user)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    }
  };

  const categoryLabel = vehicle.category ?? vehicle.type.replace("_", " ");

  return (
    <>
      <CatalogViewTracker
        type="vehicle"
        id={vehicle.id}
        name={title}
        price={vehicle.pricePerDay}
      />

      <section className="container mx-auto px-4 py-6 md:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/vehicles" className="hover:text-primary">
            Vehicles
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="min-w-0 space-y-3">
            <PackageImageGallery images={vehicle.images} alt={title} />

            <Tabs defaultValue="overview" className="min-w-0">
              <CatalogDetailTabsList>
                {[
                  { id: "overview", label: "Overview" },
                  { id: "features", label: "Features" },
                  { id: "pricing", label: "Pricing" },
                  { id: "reviews", label: "Reviews" },
                ].map((tab) => (
                  <CatalogDetailTabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </CatalogDetailTabsTrigger>
                ))}
              </CatalogDetailTabsList>

              <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <TabsContent value="overview" className="mt-0 space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {localizedText(vehicle.description, locale)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {vehicle.brand && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.brand}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {categoryLabel}
                      </Badge>
                      {vehicle.driverIncluded && (
                        <Badge className="text-xs">Driver Included</Badge>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {vehicle.location}
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="mt-0">
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {vehicle.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="pricing" className="mt-0 space-y-3">
                    <div className="rounded-lg border p-3">
                      <h4 className="text-sm font-semibold text-[#0c2444]">Per Day Rental</h4>
                      <p className="mt-1 text-lg font-bold text-primary">
                        {formatCurrency(vehicle.pricePerDay, locale)}
                        <span className="text-sm font-normal text-muted-foreground"> / day</span>
                      </p>
                      <ul className="mt-2 space-y-1">
                        {getVehicleDayInclusions(locale, vehicle, pricePerKm).map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border p-3">
                      <h4 className="text-sm font-semibold text-[#0c2444]">Per KM Rental</h4>
                      <p className="mt-1 text-lg font-bold text-primary">
                        {formatCurrency(pricePerKm, locale)}
                        <span className="text-sm font-normal text-muted-foreground"> / km</span>
                      </p>
                      <ul className="mt-2 space-y-1">
                        {getVehicleKmInclusions(locale, vehicle, pricePerKm).map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <RatingStars rating={vehicle.rating} reviewCount={vehicle.reviewCount} />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Verified reviews from travelers who rented this vehicle.
                      </p>
                      <Link
                        href="/reviews"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
                      >
                        Read all reviews
                      </Link>
                    </div>
                  </TabsContent>
                </div>

                <aside className="hidden lg:block">
                  <Card className="sticky top-24">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm font-semibold">Vehicle Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4 text-sm">
                      <InfoRow label="Seats" value={`${vehicle.seats} passengers`} />
                      <InfoRow label="Fuel Type" value={vehicle.fuelType} />
                      <InfoRow label="Category" value={categoryLabel} className="capitalize" />
                      <InfoRow
                        label="Driver"
                        value={vehicle.driverIncluded ? "Included" : "On request"}
                      />
                      <InfoRow label="Location" value={vehicle.location} />
                      <InfoRow
                        label="Per Day"
                        value={formatCurrency(vehicle.pricePerDay, locale)}
                      />
                      <InfoRow label="Per KM" value={formatCurrency(pricePerKm, locale)} />
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card id="vehicle-booking-form" className="overflow-hidden shadow-md">
              <CardHeader className="space-y-4 border-b bg-muted/20 pb-5">
                <div className="space-y-2">
                  <CardTitle className="text-xl leading-snug text-[#0c2444] md:text-2xl">
                    {title}
                  </CardTitle>
                  <RatingStars rating={vehicle.rating} reviewCount={vehicle.reviewCount} />
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    {vehicle.location}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    {vehicle.seats} seats
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Fuel className="h-4 w-4 shrink-0 text-primary" />
                    {vehicle.fuelType}
                    {vehicle.driverIncluded ? " · Driver included" : ""}
                  </li>
                </ul>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">{t(locale, "common", "from")}</p>
                  <p className="text-2xl font-bold text-[#0c2444]">
                    {formatCurrency(vehicle.pricePerDay, locale)}
                    <span className="text-sm font-normal text-muted-foreground"> / day</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    or {formatCurrency(pricePerKm, locale)} / km
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <CollapsibleBookingForm
                  locale={locale}
                  expanded={bookingExpanded}
                  onExpandedChange={setBookingExpanded}
                  payNow={payNow}
                  submitting={submitting}
                  onSubmit={handleBook}
                  scrollTargetId="vehicle-booking-form"
                  submitClassName={cn(
                    "h-12 border-0 text-base font-bold text-white shadow-lg",
                    "bg-gradient-to-r from-orange-500 to-orange-600",
                    "shadow-orange-500/35 hover:from-orange-600 hover:to-orange-700",
                    "focus-visible:ring-orange-500/50",
                    "disabled:opacity-80"
                  )}
                >
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
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

                    <TabsContent value="day" className="mt-3 space-y-3">
                      <div>
                        <Label>Pick-up Date</Label>
                        <Input
                          type="date"
                          min={todayIso()}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Return Date</Label>
                        <Input
                          type="date"
                          min={startDate || todayIso()}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="km" className="mt-3 space-y-3">
                      <div>
                        <Label>Travel Date</Label>
                        <Input
                          type="date"
                          min={todayIso()}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>One-way distance (km)</Label>
                        <Input
                          type="number"
                          min={MIN_ONE_WAY_KM}
                          step={5}
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(e.target.value)}
                          className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Round trip: {oneWayKm * 2} km · billed {billableKm} km (min{" "}
                          {VEHICLE_MIN_KM_ROUND_TRIP} km)
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
                          {formatCurrency(pricePerKm, locale)} × {billableKm} km
                        </span>
                        <span>{formatCurrency(kmTotal, locale)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(total, locale)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                      <span>Pay now</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(payNow, locale)}
                      </span>
                    </div>
                  </div>

                  <PaymentPlanSelector
                    totalAmount={total}
                    value={paymentPlan}
                    onChange={setPaymentPlan}
                    locale={locale}
                  />
                </CollapsibleBookingForm>
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedVehicles.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-[#0c2444]">Related Vehicles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedVehicles.map((related) => (
                <VehicleCard key={related.id} vehicle={related} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
