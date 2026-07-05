"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HotelSessionCountdown } from "@/components/hotels-tripjack/hotel-session-countdown";
import { useAuth } from "@/contexts/auth-context";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import type { HotelGuestDetailsForm } from "@/lib/hotels/types";
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
      if (prepared) {
        setBooking(prepared);
        if (isStaff) console.log("[hotel-payment] prepared booking:", prepared);
      }
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
        result.message ??
          "Payment received. Hotel confirmation is pending. Our team will verify and update shortly.",
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
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <p className="text-slate-600">Preparing payment…</p>
      </div>
    );
  }

  if (sessionError || !review || !guestDetails) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] py-16">
        <div className="container mx-auto max-w-lg px-4 text-center">
          <p className="font-semibold text-slate-900">
            {sessionError ?? "Session expired. Please search again."}
          </p>
          <Link href="/hotels/guests" className="mt-6 inline-block text-[#1a4fa3] hover:underline">
            Back to guest details
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = review.option.pricing.totalPrice;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/hotels/guests" className="text-sm text-[#1a4fa3] hover:underline">
            ← Back to guest details
          </Link>
          <HotelSessionCountdown />
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {api.error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {api.error}
            </div>
          )}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{review.hotelName}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {review.searchContext.checkIn} → {review.searchContext.checkOut} · {nights} nights
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {review.option.roomName} · {review.option.mealBasisLabel || review.option.mealBasis}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Lead guest: {guestDetails.primaryGuest.firstName} {guestDetails.primaryGuest.lastName}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a4fa3]/10">
                <CreditCard className="h-6 w-6 text-[#1a4fa3]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Secure payment</p>
                <p className="text-sm text-slate-500">Powered by Razorpay</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              <ShieldCheck className="h-3.5 w-3.5" />
              Your payment is encrypted and verified before hotel confirmation.
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-sm font-medium text-slate-500">Amount to pay</p>
          <p className="mt-1 text-3xl font-bold text-[#1a4fa3]">
            {formatCurrency(totalPrice, locale)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Final reviewed price (incl. taxes)</p>

          <Button
            className="mt-6 h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#16408a]"
            disabled={api.loading || !booking}
            onClick={() => void handlePay()}
          >
            {api.loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              "Pay with Razorpay"
            )}
          </Button>

          {testMode && (
            <Button
              variant="outline"
              className="mt-3 h-11 w-full rounded-xl"
              disabled={api.loading || !booking}
              onClick={() => void handleSimulate()}
            >
              Simulate payment (test mode)
            </Button>
          )}

          {!booking && ready && (
            <p className="mt-3 text-xs text-amber-700">
              Could not prepare booking. Check guest details and try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
