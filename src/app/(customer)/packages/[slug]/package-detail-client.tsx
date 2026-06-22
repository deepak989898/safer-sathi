"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageCard } from "@/components/customer/package-card";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import {
  Bus,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/customer/rating-stars";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import { useAuth } from "@/contexts/auth-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import { calculatePayNowAmount, type PaymentPlan } from "@/lib/payments/booking-payment";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { PackageCategory, TourPackage } from "@/types";
import { CatalogViewTracker } from "@/components/seo/catalog-view-tracker";
import { trackBookingStarted } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getBestTime(category: PackageCategory): string {
  switch (category) {
    case "adventure":
      return "Mar – Jun, Sep – Nov";
    case "honeymoon":
      return "Oct – Mar";
    case "international":
      return "Year-round (check visa season)";
    default:
      return "Oct – Mar";
  }
}

function getDifficulty(category: PackageCategory): string {
  return category === "adventure" ? "Moderate" : "Easy";
}

function getTourCategoryLabel(category: PackageCategory): string {
  const labels: Record<PackageCategory, string> = {
    domestic: "Domestic",
    international: "International",
    religious: "Religious & Spiritual",
    adventure: "Adventure",
    family: "Family",
    honeymoon: "Romantic",
  };
  return labels[category] ?? "Cultural";
}

function buildHighlights(pkg: TourPackage, locale: "en" | "hi"): string[] {
  const fromActivities = pkg.activities.slice(0, 4);
  const fromItinerary = pkg.itinerary
    .slice(0, 3)
    .map((day) => localizedText(day.title, locale));
  const fromCities = pkg.cities.slice(0, 2).map((city) => `${city} sightseeing`);
  return [...new Set([...fromActivities, ...fromItinerary, ...fromCities])].slice(0, 6);
}

export function PackageDetailClient({
  pkg,
  relatedPackages = [],
}: {
  pkg: TourPackage;
  relatedPackages?: TourPackage[];
}) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const { completeCatalogBooking, paying } = useTravelCheckout();
  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [specialRequest, setSpecialRequest] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");
  const submitting = paying;
  const total = pkg.price * Number(guests || 1);
  const payNow = calculatePayNowAmount(total, paymentPlan);
  const title = localizedText(pkg.title, locale);
  const highlights = useMemo(() => buildHighlights(pkg, locale), [pkg, locale]);

  const savePercent =
    pkg.originalPrice && pkg.originalPrice > pkg.price
      ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
      : null;

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !startDate) {
      toast.error("Please fill name, email, phone and travel date");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      trackBookingStarted("package", pkg.id, total);
      await completeCatalogBooking({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        serviceType: "package",
        serviceId: pkg.id,
        serviceName: { en: title, hi: pkg.title.hi },
        startDate,
        guests: Number(guests) || 1,
        amount: total,
        paymentPlan,
        userId: user?.id,
        notes: specialRequest.trim() || undefined,
      });
      router.push("/my-bookings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    }
  };

  return (
    <>
      <CatalogViewTracker
        type="package"
        id={pkg.slug}
        name={title}
        price={pkg.price}
      />

      <section className="container mx-auto px-4 py-6 md:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/packages" className="hover:text-primary">
            Tour Packages
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="min-w-0 space-y-3">
            <PackageImageGallery images={pkg.images} alt={title} />

            <Tabs defaultValue="overview" className="min-w-0">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-0.5 border-b bg-transparent p-0">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "itinerary", label: "Itinerary" },
                  { id: "inclusions", label: "Inclusions" },
                  { id: "exclusions", label: "Exclusions" },
                  { id: "hotels", label: "Hotels" },
                  { id: "reviews", label: "Reviews" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    )}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0">
                  <TabsContent value="overview" className="mt-0 space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {localizedText(pkg.description, locale)}
                    </p>
                    {pkg.transport && (
                      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                        <Bus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <h3 className="text-sm font-semibold">Transport</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {localizedText(pkg.transport, locale)}
                          </p>
                        </div>
                      </div>
                    )}
                    {highlights.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-base font-semibold text-[#0c2444]">Highlights</h3>
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {highlights.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <h3 className="mb-1.5 text-sm font-semibold">Activities</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.activities.map((a) => (
                          <Badge key={a} variant="secondary" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="itinerary" className="mt-0 space-y-2">
                    {pkg.itinerary.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Detailed itinerary coming soon.</p>
                    ) : (
                      pkg.itinerary.map((day) => (
                        <div key={day.day} className="rounded-lg border p-3">
                          <h4 className="text-sm font-semibold text-primary">
                            Day {day.day}: {localizedText(day.title, locale)}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {localizedText(day.description, locale)}
                          </p>
                          {day.activities.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {day.activities.map((a) => (
                                <Badge key={a} variant="outline" className="text-xs">
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="inclusions" className="mt-0">
                    <ul className="space-y-1.5">
                      {pkg.inclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                          {localizedText(item, locale)}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="exclusions" className="mt-0">
                    <ul className="space-y-1.5">
                      {pkg.exclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          {localizedText(item, locale)}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="hotels" className="mt-0">
                    <ul className="space-y-1.5">
                      {pkg.hotels.map((h) => (
                        <li
                          key={h}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    {pkg.meals.length > 0 && (
                      <div className="mt-3">
                        <h3 className="mb-1.5 text-sm font-semibold">Meals</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.meals.map((meal) => (
                            <Badge key={meal} variant="outline" className="text-xs">
                              {meal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <RatingStars rating={pkg.rating} reviewCount={pkg.reviewCount} />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Verified reviews from travelers who booked this package.
                      </p>
                      <Link href="/reviews" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}>
                        Read all reviews
                      </Link>
                    </div>
                  </TabsContent>
                </div>

                <aside className="hidden lg:block">
                  <Card className="sticky top-24">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm font-semibold">Trip Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4 text-sm">
                      <TripInfoRow label="Best Time to Visit" value={getBestTime(pkg.category)} />
                      <TripInfoRow label="Package Type" value={getTourCategoryLabel(pkg.category)} />
                      <TripInfoRow label="Tour Category" value={pkg.category} className="capitalize" />
                      <TripInfoRow label="Difficulty Level" value={getDifficulty(pkg.category)} />
                      <TripInfoRow
                        label="Cancellation Policy"
                        value="Free cancellation up to 7 days before travel"
                      />
                      <TripInfoRow label="Duration" value={localizedText(pkg.durationLabel, locale)} />
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card id="package-booking-form" className="overflow-hidden shadow-md">
              <CardHeader className="space-y-4 border-b bg-muted/20 pb-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-xl leading-snug text-[#0c2444] md:text-2xl">
                      {title}
                    </CardTitle>
                    {pkg.featured && <Badge>Featured</Badge>}
                  </div>
                  <RatingStars rating={pkg.rating} reviewCount={pkg.reviewCount} />
                </div>

                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    {localizedText(pkg.durationLabel, locale)}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    {pkg.cities.join(" • ")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    Group size: 2–20 people
                  </li>
                </ul>

                <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t(locale, "common", "from")}
                    </p>
                    <p className="text-2xl font-bold text-[#0c2444]">
                      {formatCurrency(pkg.price, locale)}
                      <span className="text-sm font-normal text-muted-foreground"> / person</span>
                    </p>
                  </div>
                  {pkg.originalPrice && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-through">
                        {formatCurrency(pkg.originalPrice, locale)}
                      </p>
                      {savePercent !== null && (
                        <Badge className="mt-1 bg-[#f97316] hover:bg-[#f97316]">
                          Save {savePercent}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <p className="text-sm font-medium text-[#0c2444]">Booking details</p>
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
                <div>
                  <Label>Special Request</Label>
                  <Textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="Dietary needs, room preference, etc."
                    className="mt-1.5 min-h-[72px]"
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between font-bold">
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
                <Button
                  className="w-full"
                  size="lg"
                  disabled={submitting || !startDate}
                  onClick={handleBook}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="mr-2 h-4 w-4" />
                  )}
                  {t(locale, "common", "bookNow")} · {formatCurrency(payNow, locale)}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedPackages.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-[#0c2444]">Related Packages</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPackages.map((related) => (
                <PackageCard key={related.id} pkg={related} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function TripInfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("max-w-[58%] text-right font-medium text-[#0c2444]", className)}>
        {value}
      </span>
    </div>
  );
}
