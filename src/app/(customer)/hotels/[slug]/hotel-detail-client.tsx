"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import { Check, ChevronRight, MapPin, Star, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  CatalogDetailTabsList,
  CatalogDetailTabsTrigger,
} from "@/components/customer/catalog-detail-tabs";
import { RatingStars } from "@/components/customer/rating-stars";
import { HotelCard } from "@/components/customer/hotel-card";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import { CollapsibleBookingForm } from "@/components/customer/collapsible-booking-form";
import { useAuth } from "@/contexts/auth-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import {
  postPaymentPath,
  postPaymentSuccessMessage,
} from "@/lib/bookings/post-payment-navigation";
import { calculatePayNowAmount, type PaymentPlan } from "@/lib/payments/booking-payment";
import {
  getCheapestHotelRoom,
  getEffectiveHotelPriceFrom,
} from "@/lib/catalog/hotel-pricing";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Hotel, HotelRoom } from "@/types";
import { CatalogViewTracker } from "@/components/seo/catalog-view-tracker";
import { trackBookingStarted } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export function HotelDetailClient({
  hotel,
  relatedHotels = [],
}: {
  hotel: Hotel;
  relatedHotels?: Hotel[];
}) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const { completeCatalogBooking, paying } = useTravelCheckout();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");
  const [bookingExpanded, setBookingExpanded] = useState(false);
  const submitting = paying;

  const title = localizedText(hotel.name, locale);
  const fromPrice = getEffectiveHotelPriceFrom(hotel);
  const defaultRoom = getCheapestHotelRoom(hotel);
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoom?.id ?? "");

  const selectedRoom: HotelRoom | null =
    hotel.rooms.find((r) => r.id === selectedRoomId) ?? defaultRoom;

  const pricePerNight = selectedRoom?.pricePerNight ?? fromPrice;

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (room && Number(guests) > room.maxGuests) {
      setGuests(String(room.maxGuests));
    }
  };

  const roomLabel = (room: HotelRoom) =>
    `${localizedText(room.name, locale)} — ${formatCurrency(room.pricePerNight, locale)}`;

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    return Math.max(
      1,
      Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }, [checkIn, checkOut]);

  const total = pricePerNight * nights;
  const payNow = calculatePayNowAmount(total, paymentPlan);

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill name, email and phone");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    try {
      const roomName = selectedRoom ? localizedText(selectedRoom.name, locale) : "Standard";
      trackBookingStarted("hotel", hotel.id, total);
      const result = await completeCatalogBooking({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        serviceType: "hotel",
        serviceId: hotel.id,
        serviceName: { en: title, hi: hotel.name.hi },
        startDate: checkIn,
        endDate: checkOut,
        guests: Number(guests) || 1,
        amount: total,
        paymentPlan,
        userId: user?.id,
        notes: `Room type: ${roomName} (${selectedRoom?.type ?? "standard"})`,
      });
      toast.success(
        postPaymentSuccessMessage(result.booking.bookingNumber, Boolean(user))
      );
      router.push(postPaymentPath(Boolean(user)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    }
  };

  const locationLine = [hotel.address ?? hotel.location, hotel.city, hotel.state]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <CatalogViewTracker
        type="hotel"
        id={hotel.slug ?? hotel.id}
        name={title}
        price={fromPrice}
      />

      <section className="container mx-auto px-4 py-6 md:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/hotels" className="hover:text-primary">
            Hotels
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="min-w-0 space-y-3">
            <PackageImageGallery images={hotel.images} alt={title} />

            <Tabs defaultValue="overview" className="min-w-0">
              <CatalogDetailTabsList>
                {[
                  { id: "overview", label: "Overview" },
                  { id: "amenities", label: "Amenities" },
                  { id: "rooms", label: "Rooms" },
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
                      {localizedText(hotel.description, locale)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>
                        <Star className="mr-1 h-3 w-3 fill-current" />
                        {hotel.starRating} Star Hotel
                      </Badge>
                      {hotel.featured && <Badge variant="secondary">Featured</Badge>}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {locationLine}
                    </div>
                  </TabsContent>

                  <TabsContent value="amenities" className="mt-0">
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {hotel.amenities.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>

                  <TabsContent value="rooms" className="mt-0 space-y-2">
                    {hotel.rooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Room details coming soon.</p>
                    ) : (
                      hotel.rooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => selectRoom(room.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                            selectedRoomId === room.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "hover:border-primary/40 hover:bg-muted/40"
                          )}
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#0c2444]">
                              {localizedText(room.name, locale)}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              Up to {room.maxGuests} guests
                            </p>
                            {room.amenities.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {room.amenities.slice(0, 4).map((a) => (
                                  <Badge key={a} variant="outline" className="text-xs">
                                    {a}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-primary">
                            {formatCurrency(room.pricePerNight, locale)}
                            <span className="block text-xs font-normal text-muted-foreground">
                              / night
                            </span>
                          </p>
                        </button>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <RatingStars rating={hotel.rating} reviewCount={hotel.reviewCount} />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Verified reviews from guests who stayed at this hotel.
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
                      <CardTitle className="text-sm font-semibold">Hotel Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4 text-sm">
                      <InfoRow label="Star Rating" value={`${hotel.starRating} Star`} />
                      <InfoRow label="City" value={hotel.city} />
                      <InfoRow label="Location" value={hotel.location} />
                      <InfoRow label="Check-in" value="2:00 PM onwards" />
                      <InfoRow label="Check-out" value="11:00 AM" />
                      <InfoRow
                        label="Cancellation"
                        value="Free cancellation up to 24 hrs before check-in"
                      />
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card id="hotel-booking-form" className="overflow-hidden shadow-md">
              <CardHeader className="space-y-4 border-b bg-muted/20 pb-5">
                <div className="space-y-2">
                  <CardTitle className="text-xl leading-snug text-[#0c2444] md:text-2xl">
                    {title}
                  </CardTitle>
                  <RatingStars rating={hotel.rating} reviewCount={hotel.reviewCount} />
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    {hotel.city}
                    {hotel.state ? `, ${hotel.state}` : ""}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Star className="h-4 w-4 shrink-0 text-primary" />
                    {hotel.starRating} Star Hotel
                  </li>
                  {selectedRoom && (
                    <li className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      {localizedText(selectedRoom.name, locale)} · up to {selectedRoom.maxGuests}{" "}
                      guests
                    </li>
                  )}
                </ul>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">{t(locale, "common", "from")}</p>
                  <p className="text-2xl font-bold text-[#0c2444]">
                    {formatCurrency(fromPrice, locale)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {t(locale, "common", "perNight")}
                    </span>
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
                  submitDisabled={!checkIn || !checkOut}
                  onSubmit={handleBook}
                  scrollTargetId="hotel-booking-form"
                  submitClassName="bg-[#f97316] hover:bg-[#ea580c]"
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
                  {hotel.rooms.length > 0 && (
                    <div>
                      <Label>Room Type</Label>
                      <Select
                        value={selectedRoomId}
                        onValueChange={(value) => value && selectRoom(value)}
                      >
                        <SelectTrigger className="mt-1.5 w-full">
                          <SelectValue placeholder="Select room type">
                            {selectedRoom ? roomLabel(selectedRoom) : "Select room type"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {hotel.rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {roomLabel(room)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                      max={selectedRoom?.maxGuests ?? 4}
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex justify-between text-sm">
                      <span>
                        {formatCurrency(pricePerNight, locale)} × {nights} nights
                      </span>
                      <span>{formatCurrency(total, locale)}</span>
                    </div>
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

        {relatedHotels.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-[#0c2444]">Related Hotels</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedHotels.map((related) => (
                <HotelCard key={related.id} hotel={related} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
