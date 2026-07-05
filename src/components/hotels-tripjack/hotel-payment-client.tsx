"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelPrimaryButton,
  HotelPriceSummary,
  HotelStepBar,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { useAuth } from "@/contexts/auth-context";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import type { HotelBookingRecord, HotelGuestDetailsForm } from "@/lib/hotels/types";
import { isHotelTestBookingEnabled } from "@/lib/hotels/test-booking";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { formatCurrency } from "@/lib/i18n";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

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

export function HotelPaymentClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useHotelBookingApi();

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [guestDetails, setGuestDetails] = useState<HotelGuestDetailsForm | null>(null);
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);

  const isStaff = user ? canShowAdminNav(user.role) : false;
  const testMode = isHotelTestBookingEnabled();

  const nights = useMemo(() => {
    if (!review) return 0;
    const diff = Math.round(
      (new Date(`${review.searchContext.checkOut}T12:00:00`).getTime() -
        new Date(`${review.searchContext.checkIn}T12:00:00`).getTime()) /
        86400000
    );
    return Math.max(1, diff);
  }, [review]);

  useEffect(() => {
    if (isHotelSearchSessionExpired()) {
      setSessionError("Hotel session expired. Please search again.");
      setReady(true);
      return;
    }

    const loadedReview = loadHotelReviewResult();
    const loadedGuests = loadGuestDetails();
    if (!loadedReview || !loadedGuests) {
      setSessionError("Guest details missing. Please complete the guest form.");
      setReady(true);
      return;
    }

    setReview(loadedReview);
    setGuestDetails(loadedGuests);

    void (async () => {
      const prepared = await api.prepareBooking({
        review: loadedReview,
        guestDetails: loadedGuests,
      });
      if (prepared) setBooking(prepared);
      setReady(true);
    })();
  }, []);

  const finish = (result: {
    booking: HotelBookingRecord;
    manualReview?: boolean;
    message?: string;
    testMode?: boolean;
  }) => {
    sessionStorage.setItem("tripjack_hotel_confirmed_booking", JSON.stringify(result.booking));
    if (result.manualReview) {
      toast.info(
        result.message ?? "Payment received. Booking confirmation is in progress.",
        { duration: 3500 }
      );
    } else if (result.booking.status === "confirmed") {
      toast.success(
        result.testMode ? "Hotel booking confirmed (test mode)!" : "Hotel booking confirmed!",
        { duration: 2500 }
      );
    }
    router.push(`/hotels/booking-success?bookingId=${result.booking.bookingId}`);
  };

  const handlePay = async () => {
    if (!booking || !guestDetails) return;
    const pg = guestDetails.primaryGuest;
    const result = await api.payForBooking(
      booking,
      {
        name: `${pg.firstName} ${pg.lastName}`.trim(),
        email: pg.email,
        phone: pg.mobile,
      },
      { isStaff }
    );
    if (!result?.booking) return;
    finish(result);
  };

  const handleSimulate = async () => {
    if (!booking) return;
    const result = await api.simulatePaymentSuccess(booking);
    if (!result?.booking) return;
    finish({ ...result, testMode: true });
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        Preparing payment…
      </div>
    );
  }

  if (sessionError || !review || !guestDetails) {
    return (
      <HotelBookingLayout title="Payment" maxWidth="md">
        <HotelCard className="py-12 text-center">
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            {sessionError ?? "Session expired. Please search again."}
          </p>
          <Link href="/hotels/guests" className="mt-4 inline-block text-sm font-semibold" style={{ color: HOTEL_UI.action }}>
            Back to guest details
          </Link>
        </HotelCard>
      </HotelBookingLayout>
    );
  }

  const totalPrice = review.option.pricing.totalPrice;

  return (
    <HotelBookingLayout
      title="Payment"
      subtitle="Secure checkout via Razorpay"
      backHref="/hotels/guests"
      backLabel="Back to guest details"
      showCountdown
      maxWidth="xl"
    >
      <HotelStepBar steps={["Search", "Select Room", "Review", "Guests", "Payment"]} current={4} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {api.error && (
            <div className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {api.error}
            </div>
          )}

          <HotelCard>
            <h2 className="text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
              {review.hotelName}
            </h2>
            <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
              {review.searchContext.checkIn} → {review.searchContext.checkOut} · {nights} nights
            </p>
            <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
              {review.option.roomName} · {review.option.mealBasisLabel || review.option.mealBasis}
            </p>
            <p className="mt-1 text-xs" style={{ color: HOTEL_UI.textMuted }}>
              Lead guest: {guestDetails.primaryGuest.firstName} {guestDetails.primaryGuest.lastName}
            </p>
          </HotelCard>

          <HotelCard>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center"
                style={{ backgroundColor: "#E8F4FD", borderRadius: HOTEL_UI.cardRadius }}
              >
                <CreditCard className="h-6 w-6" style={{ color: HOTEL_UI.action }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
                  Secure payment
                </p>
                <p className="text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  Powered by Razorpay — UPI, Cards, Netbanking
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
              <Lock className="h-3.5 w-3.5" />
              <ShieldCheck className="h-3.5 w-3.5" />
              Encrypted & verified before hotel confirmation
            </div>
          </HotelCard>
        </div>

        <HotelPriceSummary
          lines={[
            { label: "Hotel", value: review.hotelName.slice(0, 24) + (review.hotelName.length > 24 ? "…" : "") },
            { label: "Amount", value: formatCurrency(totalPrice, locale) },
          ]}
          total={formatCurrency(totalPrice, locale)}
          totalLabel="Amount to pay"
          footer={
            <>
              <HotelPrimaryButton loading={api.loading} disabled={!booking} onClick={() => void handlePay()}>
                Pay with Razorpay
              </HotelPrimaryButton>
              {testMode && (
                <HotelPrimaryButton
                  variant="outline"
                  className="mt-3"
                  disabled={api.loading || !booking}
                  onClick={() => void handleSimulate()}
                >
                  Simulate payment (test)
                </HotelPrimaryButton>
              )}
            </>
          }
        />
      </div>
    </HotelBookingLayout>
  );
}
