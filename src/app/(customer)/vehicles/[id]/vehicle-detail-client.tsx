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
  Sun,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CatalogDetailTabsList,
  CatalogDetailTabsTrigger,
} from "@/components/customer/catalog-detail-tabs";
import { Textarea } from "@/components/ui/textarea";
import { CatalogReviewsTab } from "@/components/customer/catalog-reviews-tab";
import { RatingStars } from "@/components/customer/rating-stars";
import { VehicleInformationCard } from "@/components/customer/vehicle-information-card";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import { CollapsibleBookingForm } from "@/components/customer/collapsible-booking-form";
import { BookingDateInput } from "@/components/customer/booking-date-input";
import { RewardRedeemPanel } from "@/components/customer/reward-redeem-panel";
import { POINT_VALUE_INR } from "@/lib/rewards/constants";
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
  type VehiclePricingMode,
} from "@/lib/vehicles/pricing-policy";
import { getEffectivePricePerKm } from "@/lib/vehicles/capacity";

const MIN_ONE_WAY_KM = 50;
const DEFAULT_DEPARTURE = "Your Location";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const [bookingMode, setBookingMode] = useState<VehiclePricingMode>("day");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(tomorrowIso);
  const [guests, setGuests] = useState("1");
  const [distanceKm, setDistanceKm] = useState(String(MIN_ONE_WAY_KM));
  const [departure, setDeparture] = useState(DEFAULT_DEPARTURE);
  const [destination, setDestination] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [specialRequest, setSpecialRequest] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");
  const [rewardPointsToRedeem, setRewardPointsToRedeem] = useState(0);
  const [bookingExpanded, setBookingExpanded] = useState(false);
  const submitting = paying;

  const title = localizedText(vehicle.name, locale);
  const pricePerKm = getEffectivePricePerKm(vehicle);

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
  const rewardDiscount = rewardPointsToRedeem * POINT_VALUE_INR;
  const payableTotal = Math.max(1, total - rewardDiscount);
  const payNow = calculatePayNowAmount(payableTotal, paymentPlan);

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill name, email and phone");
      return;
    }
    const tripDeparture = departure.trim() || DEFAULT_DEPARTURE;
    const tripDestination = destination.trim();
    if (!tripDestination) {
      toast.error("Please enter where you want to go (destination)");
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
        departure: tripDeparture,
        destination: tripDestination,
        userId: user?.id,
        rewardPointsToRedeem: rewardPointsToRedeem || undefined,
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
                    <p className="text-xs text-muted-foreground">
                      Select a pricing option — your choice updates the vehicle information and booking price.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setBookingMode("day")}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          bookingMode === "day"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Sun className="h-3.5 w-3.5" />
                          Per Day Rental
                        </div>
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
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("km")}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          bookingMode === "km"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Route className="h-3.5 w-3.5" />
                          Per KM Rental
                        </div>
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
                      </button>
                    </div>
                    <div className="lg:hidden">
                      <VehicleInformationCard
                        vehicle={vehicle}
                        locale={locale}
                        bookingMode={bookingMode}
                        categoryLabel={categoryLabel}
                        days={days}
                        billableKm={billableKm}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <CatalogReviewsTab
                      serviceType="vehicle"
                      serviceId={vehicle.id}
                      entityName={title}
                      rating={vehicle.rating}
                      reviewCount={vehicle.reviewCount}
                      description="Verified reviews from travelers who rented this vehicle."
                    />
                  </TabsContent>
                </div>

                <aside className="hidden lg:block">
                  <VehicleInformationCard
                    vehicle={vehicle}
                    locale={locale}
                    bookingMode={bookingMode}
                    categoryLabel={categoryLabel}
                    days={days}
                    billableKm={billableKm}
                  />
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
                  <p className="text-xs text-muted-foreground">
                    {bookingMode === "day" ? "Per day rental" : "Per km rental"}
                  </p>
                  {bookingMode === "day" ? (
                    <>
                      <p className="text-2xl font-bold text-[#0c2444]">
                        {formatCurrency(vehicle.pricePerDay, locale)}
                        <span className="text-sm font-normal text-muted-foreground"> / day</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {days} day{days === 1 ? "" : "s"} · Total{" "}
                        {formatCurrency(dayTotal, locale)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[#0c2444]">
                        {formatCurrency(pricePerKm, locale)}
                        <span className="text-sm font-normal text-muted-foreground"> / km</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {billableKm} km billed · Total {formatCurrency(kmTotal, locale)}
                      </p>
                    </>
                  )}
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
                    onValueChange={(value) => setBookingMode(value as VehiclePricingMode)}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="day">Per Day</TabsTrigger>
                      <TabsTrigger value="km">Per KM</TabsTrigger>
                    </TabsList>

                    <TabsContent value="day" className="mt-3 space-y-3">
                      <div>
                        <Label>Pick-up Date</Label>
                        <BookingDateInput
                          min={todayIso()}
                          value={startDate}
                          onChange={setStartDate}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Return Date</Label>
                        <BookingDateInput
                          min={startDate || todayIso()}
                          value={endDate}
                          onChange={setEndDate}
                          className="mt-1.5"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="km" className="mt-3 space-y-3">
                      <div>
                        <Label>Travel Date</Label>
                        <BookingDateInput
                          min={todayIso()}
                          value={startDate}
                          onChange={setStartDate}
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

                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <p className="text-sm font-medium text-[#0c2444]">Where do you want to go?</p>
                    <div>
                      <Label htmlFor="vehicle-departure">Departure (start point)</Label>
                      <Input
                        id="vehicle-departure"
                        value={departure}
                        onChange={(e) => setDeparture(e.target.value)}
                        placeholder="Your Location"
                        className="mt-1.5"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Default is your pickup location — edit if you start elsewhere.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="vehicle-destination">Destination</Label>
                      <Input
                        id="vehicle-destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Jaipur, Agra, Manali"
                        className="mt-1.5"
                        required
                      />
                    </div>
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
                      <span className="text-primary">{formatCurrency(payableTotal, locale)}</span>
                    </div>
                    {rewardDiscount > 0 && (
                      <div className="mt-1 flex justify-between text-xs text-emerald-700">
                        <span>Reward discount</span>
                        <span>−{formatCurrency(rewardDiscount, locale)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                      <span>Pay now</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(payNow, locale)}
                      </span>
                    </div>
                  </div>

                  <PaymentPlanSelector
                    totalAmount={payableTotal}
                    value={paymentPlan}
                    onChange={setPaymentPlan}
                    locale={locale}
                  />
                  {user?.role === "customer" && total > 0 && (
                    <RewardRedeemPanel
                      bookingAmount={total}
                      value={rewardPointsToRedeem}
                      onChange={setRewardPointsToRedeem}
                    />
                  )}
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
