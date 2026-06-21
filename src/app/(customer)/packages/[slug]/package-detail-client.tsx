"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageHeader } from "@/components/customer/detail-page-header";
import { PackageCard } from "@/components/customer/package-card";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { Bus, Calendar, Check, Clock, Loader2, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { TourPackage } from "@/types";
import { CatalogViewTracker } from "@/components/seo/catalog-view-tracker";
import { trackBookingStarted } from "@/lib/analytics";
import { toast } from "sonner";

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
      const title = localizedText(pkg.title, locale);
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
        name={localizedText(pkg.title, locale)}
        price={pkg.price}
      />
      <DetailPageHeader
        title={localizedText(pkg.title, locale)}
        backHref="/packages"
        backLabel="Back to Packages"
      />
      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              <ImageAutoSlider
                images={pkg.images}
                alt={localizedText(pkg.title, locale)}
                sizes="100vw"
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
                {pkg.transport && (
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-4">
                    <Bus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-semibold">Transport</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {localizedText(pkg.transport, locale)}
                      </p>
                    </div>
                  </div>
                )}
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
                  <span className="text-sm font-normal text-muted-foreground"> / person</span>
                </CardTitle>
                {pkg.originalPrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatCurrency(pkg.originalPrice, locale)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
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
            <h2 className="mb-6 text-2xl font-bold">Related Packages</h2>
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
