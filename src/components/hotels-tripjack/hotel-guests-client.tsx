"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelSessionCountdown } from "@/components/hotels-tripjack/hotel-session-countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/i18n";
import type { HotelGuestDetailsForm, HotelPrimaryGuestForm, HotelRoomGuestForm } from "@/lib/hotels/types";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function countNights(checkIn: string, checkOut: string) {
  const diff = Math.round(
    (new Date(`${checkOut}T12:00:00`).getTime() - new Date(`${checkIn}T12:00:00`).getTime()) /
      86400000
  );
  return Math.max(1, diff);
}

function buildEmptyRoomGuests(review: NormalizedHotelReviewResult): HotelRoomGuestForm[][] {
  return review.searchContext.rooms.map((room) => {
    const guests: HotelRoomGuestForm[] = [];
    for (let i = 0; i < (room.adults ?? 1); i += 1) {
      guests.push({ title: "Mr", gender: "Male", firstName: "", lastName: "", type: "ADULT" });
    }
    for (let i = 0; i < (room.children ?? 0); i += 1) {
      guests.push({
        title: "Mstr",
        gender: "Male",
        firstName: "",
        lastName: "",
        type: "CHILD",
        age: room.childAge?.[i] ?? 5,
      });
    }
    return guests;
  });
}

export function HotelGuestsClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [primaryGuest, setPrimaryGuest] = useState<HotelPrimaryGuestForm>({
    firstName: "",
    lastName: "",
    gender: "Male",
    email: "",
    mobile: "",
    countryCode: "91",
    nationality: "Indian",
    address: "",
    city: "",
    state: "",
    country: "India",
    zipCode: "",
  });
  const [roomGuests, setRoomGuests] = useState<HotelRoomGuestForm[][]>([]);
  const [specialRequests, setSpecialRequests] = useState("");

  useEffect(() => {
    if (isHotelSearchSessionExpired()) {
      toast.error("Session expired. Please search again.");
      router.push("/hotels/search");
      return;
    }
    const loaded = loadHotelReviewResult();
    if (!loaded) {
      toast.error("Complete review step first.");
      router.push("/hotels/review");
      return;
    }
    setReview(loaded);
    setRoomGuests(buildEmptyRoomGuests(loaded));
    if (user?.email) setPrimaryGuest((p) => ({ ...p, email: user.email }));
    if (user?.phone) {
      setPrimaryGuest((p) => ({ ...p, mobile: user.phone!.replace(/\D/g, "").slice(-10) }));
    }
    if (user?.name) {
      const parts = user.name.split(" ");
      setPrimaryGuest((p) => ({
        ...p,
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") || parts[0] || "",
      }));
    }
  }, [router, user]);

  const nights = useMemo(
    () => (review ? countNights(review.searchContext.checkIn, review.searchContext.checkOut) : 0),
    [review]
  );

  const updateRoomGuest = (
    roomIndex: number,
    guestIndex: number,
    patch: Partial<HotelRoomGuestForm>
  ) => {
    setRoomGuests((rows) =>
      rows.map((room, ri) =>
        ri === roomIndex
          ? room.map((guest, gi) => (gi === guestIndex ? { ...guest, ...patch } : guest))
          : room
      )
    );
  };

  const onSubmit = async () => {
    if (!review) return;
    if (!primaryGuest.firstName.trim() || !primaryGuest.lastName.trim()) {
      toast.error("Enter primary guest name");
      return;
    }
    if (!primaryGuest.email.includes("@") || primaryGuest.mobile.length < 10) {
      toast.error("Enter valid email and mobile");
      return;
    }
    if (review.option.panRequired && !primaryGuest.pan?.trim()) {
      toast.error("PAN is required");
      return;
    }
    if (review.option.passportRequired) {
      if (!primaryGuest.passportNumber?.trim() || !primaryGuest.passportExpiry?.trim()) {
        toast.error("Passport details are required");
        return;
      }
    }

    for (let ri = 0; ri < roomGuests.length; ri += 1) {
      for (const guest of roomGuests[ri]) {
        if (!guest.firstName.trim() || !guest.lastName.trim()) {
          toast.error(`Enter names for all guests in room ${ri + 1}`);
          return;
        }
        if (guest.type === "CHILD" && guest.age == null) {
          toast.error(`Enter age for child in room ${ri + 1}`);
          return;
        }
      }
    }

    const guestDetails: HotelGuestDetailsForm = {
      primaryGuest,
      roomGuests,
      specialRequests: specialRequests.trim() || undefined,
    };

    setSubmitting(true);
    try {
      sessionStorage.setItem("tripjack_hotel_guest_details", JSON.stringify(guestDetails));
      sessionStorage.setItem("tripjack_hotel_review_for_payment", JSON.stringify(review));
      router.push("/hotels/payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!review) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-600">
        Loading…
      </div>
    );
  }

  const option = review.option;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/hotels/review"
            className="inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to review
          </Link>
          <HotelSessionCountdown />
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Guest details</h1>
          <p className="mt-1 text-sm text-slate-600">{review.hotelName}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {review.searchContext.checkIn} → {review.searchContext.checkOut}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{nights} nights</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {review.searchContext.rooms.length} room(s)
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {option.mealBasisLabel || option.mealBasis}
            </span>
            <span className="rounded-full bg-[#1a4fa3]/10 px-3 py-1 font-semibold text-[#1a4fa3]">
              {formatCurrency(option.pricing.totalPrice, locale)}
            </span>
          </div>
          {option.bookingNotes?.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Booking notes</p>
              <ul className="mt-1 list-inside list-disc">
                {option.bookingNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Primary guest & contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={primaryGuest.firstName} onChange={(v) => setPrimaryGuest((p) => ({ ...p, firstName: v }))} />
            <Field label="Last name" value={primaryGuest.lastName} onChange={(v) => setPrimaryGuest((p) => ({ ...p, lastName: v }))} />
            <Field label="Email" type="email" value={primaryGuest.email} onChange={(v) => setPrimaryGuest((p) => ({ ...p, email: v }))} />
            <Field label="Mobile" value={primaryGuest.mobile} onChange={(v) => setPrimaryGuest((p) => ({ ...p, mobile: v.replace(/\D/g, "").slice(0, 10) }))} />
            <Field label="Address" className="sm:col-span-2" value={primaryGuest.address} onChange={(v) => setPrimaryGuest((p) => ({ ...p, address: v }))} />
            <Field label="City" value={primaryGuest.city} onChange={(v) => setPrimaryGuest((p) => ({ ...p, city: v }))} />
            <Field label="State" value={primaryGuest.state} onChange={(v) => setPrimaryGuest((p) => ({ ...p, state: v }))} />
            <Field label="Country" value={primaryGuest.country} onChange={(v) => setPrimaryGuest((p) => ({ ...p, country: v }))} />
            <Field label="Zip code" value={primaryGuest.zipCode} onChange={(v) => setPrimaryGuest((p) => ({ ...p, zipCode: v }))} />
            {review.option.panRequired && (
              <Field label="PAN number *" value={primaryGuest.pan ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, pan: v.toUpperCase() }))} />
            )}
            {review.option.passportRequired && (
              <>
                <Field label="Passport number *" value={primaryGuest.passportNumber ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportNumber: v }))} />
                <Field label="Passport expiry *" type="date" value={primaryGuest.passportExpiry ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportExpiry: v }))} />
                <Field label="Passport nationality" value={primaryGuest.passportNationality ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportNationality: v }))} />
                <Field label="Issue country" value={primaryGuest.passportIssueCountry ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportIssueCountry: v }))} />
              </>
            )}
          </div>
        </div>

        {roomGuests.map((room, roomIndex) => (
          <div key={roomIndex} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Room {roomIndex + 1} guests</h2>
            <div className="mt-4 space-y-4">
              {room.map((guest, guestIndex) => (
                <div key={guestIndex} className="grid gap-3 sm:grid-cols-4">
                  <Field label="Title" value={guest.title} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { title: v as HotelRoomGuestForm["title"] })} />
                  <Field label="First name" value={guest.firstName} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { firstName: v })} />
                  <Field label="Last name" value={guest.lastName} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { lastName: v })} />
                  {guest.type === "CHILD" ? (
                    <Field label="Age" type="number" value={String(guest.age ?? "")} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { age: Number(v) || 0 })} />
                  ) : (
                    <div className="flex items-end pb-2 text-xs text-slate-500">Adult</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <Label>Special requests (optional)</Label>
          <Input className="mt-2" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
        </div>

        <HotelCancellationTimeline
          isRefundable={option.isRefundable}
          freeCancellationUntil={option.freeCancellationUntil}
          penalties={option.penalties}
          locale={locale}
        />

        <Button
          className="h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#16408a]"
          disabled={submitting}
          onClick={() => void onSubmit()}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing…
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input className="mt-1 h-11 rounded-xl" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
