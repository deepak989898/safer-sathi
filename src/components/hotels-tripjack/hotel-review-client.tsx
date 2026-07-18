"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  HOTEL_BOOKING_STEPS,
  HotelLockedBookingSummary,
} from "@/components/hotels-tripjack/hotel-locked-booking-summary";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelInfoBanner,
  HotelPrimaryButton,
  HotelPriceSummary,
  HotelStepBar,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { formatCurrency } from "@/lib/i18n";
import type { HotelGuestDetailsForm } from "@/lib/hotels/types";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function loadGuestDetails(): HotelGuestDetailsForm | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tripjack_hotel_guest_details");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HotelGuestDetailsForm;
  } catch {
    return null;
  }
}

export function HotelReviewClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [guests, setGuests] = useState<HotelGuestDetailsForm | null>(null);

  useEffect(() => {
    if (isHotelSearchSessionExpired()) {
      setError("Session expired. Please search hotels again.");
      setReady(true);
      return;
    }

    const loadedReview = loadHotelReviewResult();
    const loadedGuests = loadGuestDetails();

    if (!loadedReview) {
      setError("Room selection missing. Please select a room first.");
      setReady(true);
      return;
    }

    if (!loadedGuests) {
      toast.error("Please complete guest details first.");
      router.replace("/hotels/guests");
      return;
    }

    setReview(loadedReview);
    setGuests(loadedGuests);
    setReady(true);
  }, [router]);

  const option = review?.option;
  const detailHref = review
    ? `/hotels/detail/${encodeURIComponent(String(review.tjHotelId))}`
    : "/hotels/results";

  const roomGuestRows = useMemo(() => {
    if (!guests) return [];
    return guests.roomGuests.flatMap((room, roomIndex) =>
      room.map((guest, guestIndex) => ({
        key: `${roomIndex}-${guestIndex}`,
        roomLabel: `Room ${roomIndex + 1}`,
        label: `${guest.title} ${guest.firstName} ${guest.lastName}`.trim(),
        type: guest.type === "CHILD" ? `Child${guest.age != null ? ` · age ${guest.age}` : ""}` : "Adult",
      }))
    );
  }, [guests]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        Preparing final review…
      </div>
    );
  }

  if (error || !review || !option || !guests) {
    return (
      <HotelBookingLayout
        title="Review Booking"
        backHref="/hotels/guests"
        backLabel="Back to guest details"
        showCountdown
        maxWidth="xl"
      >
        <HotelStepBar steps={[...HOTEL_BOOKING_STEPS]} current={3} />
        <HotelCard className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            {error ?? "Booking details incomplete"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/hotels/guests">
              <HotelPrimaryButton className="!w-auto px-6">Go to guest details</HotelPrimaryButton>
            </Link>
            <Link href={detailHref}>
              <HotelPrimaryButton variant="outline" className="!w-auto px-6">
                Choose another room
              </HotelPrimaryButton>
            </Link>
          </div>
        </HotelCard>
      </HotelBookingLayout>
    );
  }

  const pg = guests.primaryGuest;

  return (
    <HotelBookingLayout
      title="Review Booking"
      subtitle={review.hotelName}
      backHref="/hotels/guests"
      backLabel="Back to guest details"
      showCountdown
      maxWidth="xl"
    >
      <HotelStepBar steps={[...HOTEL_BOOKING_STEPS]} current={3} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <HotelLockedBookingSummary review={review} locale={locale} showCancellation />

          <HotelCard>
            <h3 className="font-bold" style={{ color: HOTEL_UI.primary }}>
              Guest Details
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Lead guest: </span>
                <span className="font-semibold">
                  {pg.firstName} {pg.lastName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                {pg.email}
              </p>
              <p>
                <span className="text-muted-foreground">Phone: </span>
                +{pg.countryCode} {pg.mobile}
              </p>
              <p>
                <span className="text-muted-foreground">Address: </span>
                {[pg.address, pg.city, pg.state, pg.country, pg.zipCode].filter(Boolean).join(", ")}
              </p>
              {pg.pan ? (
                <p>
                  <span className="text-muted-foreground">PAN: </span>
                  {pg.pan}
                </p>
              ) : null}
            </div>

            {roomGuestRows.length > 0 ? (
              <div className="mt-4 border-t pt-4" style={{ borderColor: HOTEL_UI.border }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Travellers
                </p>
                <ul className="space-y-2 text-sm">
                  {roomGuestRows.map((row) => (
                    <li key={row.key} className="flex items-center justify-between gap-3">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.roomLabel} · {row.type}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </HotelCard>
        </div>

        <div className="space-y-4">
          <HotelPriceSummary
            lines={[
              { label: "Base price", value: formatCurrency(option.pricing.basePrice, locale) },
              { label: "Taxes", value: formatCurrency(option.pricing.taxes, locale) },
              { label: "Fees", value: formatCurrency(option.pricing.mf + option.pricing.mft, locale) },
              ...(option.pricing.discount > 0
                ? [
                    {
                      label: "Discount",
                      value: `-${formatCurrency(option.pricing.discount, locale)}`,
                      highlight: true,
                    },
                  ]
                : []),
            ]}
            total={formatCurrency(option.pricing.totalPrice, locale)}
            totalLabel="Total payable"
            footer={
              <HotelPrimaryButton onClick={() => router.push("/hotels/payment")}>
                Continue to Payment
              </HotelPrimaryButton>
            }
          />
          <HotelInfoBanner variant="success">
            {option.isRefundable
              ? "Free cancellation on this booking until policy deadline."
              : "This booking is non-refundable."}
          </HotelInfoBanner>
        </div>
      </div>
    </HotelBookingLayout>
  );
}
