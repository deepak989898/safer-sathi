"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelFieldLabel,
  HotelInfoBanner,
  HotelPrimaryButton,
  HotelPriceSummary,
  HotelStepBar,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
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
    if (
      !primaryGuest.address.trim() ||
      !primaryGuest.city.trim() ||
      !primaryGuest.state.trim() ||
      !primaryGuest.zipCode.trim()
    ) {
      toast.error("Enter complete address, city, state and PIN code");
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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        Loading…
      </div>
    );
  }

  const option = review.option;

  return (
    <HotelBookingLayout
      title="Guest Details"
      subtitle={review.hotelName}
      backHref="/hotels/review"
      backLabel="Back to review"
      showCountdown
      maxWidth="xl"
    >
      <HotelStepBar steps={["Search", "Select Room", "Review", "Guests", "Payment"]} current={3} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <HotelCard>
            <h2 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
              Primary Guest &amp; Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="First name *" value={primaryGuest.firstName} onChange={(v) => setPrimaryGuest((p) => ({ ...p, firstName: v }))} />
              <Field label="Last name *" value={primaryGuest.lastName} onChange={(v) => setPrimaryGuest((p) => ({ ...p, lastName: v }))} />
              <Field label="Email *" type="email" value={primaryGuest.email} onChange={(v) => setPrimaryGuest((p) => ({ ...p, email: v }))} />
              <Field label="Phone *" value={primaryGuest.mobile} onChange={(v) => setPrimaryGuest((p) => ({ ...p, mobile: v.replace(/\D/g, "").slice(0, 10) }))} />
              <Field label="Address *" className="sm:col-span-2" value={primaryGuest.address} onChange={(v) => setPrimaryGuest((p) => ({ ...p, address: v }))} />
              <Field label="City *" value={primaryGuest.city} onChange={(v) => setPrimaryGuest((p) => ({ ...p, city: v }))} />
              <Field label="State *" value={primaryGuest.state} onChange={(v) => setPrimaryGuest((p) => ({ ...p, state: v }))} />
              <Field label="Country *" value={primaryGuest.country} onChange={(v) => setPrimaryGuest((p) => ({ ...p, country: v }))} />
              <Field label="Zip code *" value={primaryGuest.zipCode} onChange={(v) => setPrimaryGuest((p) => ({ ...p, zipCode: v }))} />
              {review.option.panRequired && (
                <Field label="PAN number *" value={primaryGuest.pan ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, pan: v.toUpperCase() }))} />
              )}
              {review.option.passportRequired && (
                <>
                  <Field label="Passport number *" value={primaryGuest.passportNumber ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportNumber: v }))} />
                  <Field label="Passport expiry *" type="date" value={primaryGuest.passportExpiry ?? ""} onChange={(v) => setPrimaryGuest((p) => ({ ...p, passportExpiry: v }))} />
                </>
              )}
            </div>
          </HotelCard>

          {roomGuests.map((room, roomIndex) => (
            <HotelCard key={roomIndex}>
              <h2 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
                Room {roomIndex + 1} — Guest names
              </h2>
              <div className="mt-4 space-y-4">
                {room.map((guest, guestIndex) => (
                  <div key={guestIndex} className="grid gap-3 sm:grid-cols-4">
                    <Field label="Title" value={guest.title} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { title: v as HotelRoomGuestForm["title"] })} />
                    <Field label="First name *" value={guest.firstName} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { firstName: v })} />
                    <Field label="Last name *" value={guest.lastName} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { lastName: v })} />
                    {guest.type === "CHILD" ? (
                      <Field label="Age *" type="number" value={String(guest.age ?? "")} onChange={(v) => updateRoomGuest(roomIndex, guestIndex, { age: Number(v) || 0 })} />
                    ) : (
                      <div className="flex items-end pb-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
                        Adult
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </HotelCard>
          ))}

          <HotelCard>
            <HotelFieldLabel>Special requests (optional)</HotelFieldLabel>
            <textarea
              className="mt-2 min-h-[80px] w-full rounded border bg-white p-3 text-sm"
              style={{ borderColor: HOTEL_UI.border }}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </HotelCard>
        </div>

        <div className="space-y-4">
          <HotelPriceSummary
            lines={[
              { label: "Room", value: option.roomInfo[0] || option.roomName },
              { label: "Nights", value: String(nights) },
              { label: "Meal plan", value: option.mealBasisLabel || option.mealBasis },
              {
                label: "Subtotal",
                value: formatCurrency(option.pricing.basePrice, locale),
              },
              {
                label: "Taxes & fees",
                value: formatCurrency(option.pricing.taxes + option.pricing.mf + option.pricing.mft, locale),
              },
            ]}
            total={formatCurrency(option.pricing.totalPrice, locale)}
            footer={
              <HotelPrimaryButton loading={submitting} onClick={() => void onSubmit()}>
                Save &amp; Continue to Payment
              </HotelPrimaryButton>
            }
          />
          <HotelInfoBanner variant="success">
            {option.isRefundable
              ? "Free cancellation available on this rate."
              : "This rate is non-refundable."}
          </HotelInfoBanner>
        </div>
      </div>
    </HotelBookingLayout>
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
      <HotelFieldLabel>{label}</HotelFieldLabel>
      <input
        className="mt-1.5 h-11 w-full rounded border bg-white px-3 text-sm"
        style={{ borderColor: HOTEL_UI.border }}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
