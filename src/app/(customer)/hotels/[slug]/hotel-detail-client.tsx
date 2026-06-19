"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageHeader } from "@/components/customer/detail-page-header";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { Calendar, Loader2, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { RatingStars } from "@/components/customer/rating-stars";
import { useAuth } from "@/contexts/auth-context";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Hotel, HotelRoom } from "@/types";
import { toast } from "sonner";

export function HotelDetailClient({ hotel }: { hotel: Hotel }) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);

  const defaultRoom = hotel.rooms[0] ?? null;
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoom?.id ?? "");

  const selectedRoom: HotelRoom | null =
    hotel.rooms.find((r) => r.id === selectedRoomId) ?? defaultRoom;

  const pricePerNight = selectedRoom?.pricePerNight ?? hotel.priceFrom;

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

  const handleBook = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill name, email and phone");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    setSubmitting(true);
    try {
      const title = localizedText(hotel.name, locale);
      const roomLabel = selectedRoom ? localizedText(selectedRoom.name, locale) : "Standard";
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          userId: user?.id,
          notes: `Room type: ${roomLabel} (${selectedRoom?.type ?? "standard"})`,
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

  return (
    <>
      <DetailPageHeader
        title={localizedText(hotel.name, locale)}
        backHref="/hotels"
        backLabel="Back to Hotels"
      />
      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
              <ImageAutoSlider
                images={hotel.images}
                alt={localizedText(hotel.name, locale)}
                sizes="100vw"
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
                    {hotel.address ?? hotel.location}, {hotel.city}
                    {hotel.state ? `, ${hotel.state}` : ""}
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
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => selectRoom(room.id)}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                          selectedRoomId === room.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "hover:border-primary/40 hover:bg-muted/40"
                        }`}
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
                      </button>
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
                  {formatCurrency(pricePerNight, locale)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {t(locale, "common", "perNight")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
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
                  <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>{t(locale, "hero", "checkOut")}</Label>
                  <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-1.5" />
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
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!checkIn || !checkOut || submitting}
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
