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
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import type { HotelBookingRecord, HotelGuestDetailsForm } from "@/lib/hotels/types";
import { normalizeGuestDetailsForm } from "@/lib/hotels/guest-validation";
import { isHotelTestBookingEnabled } from "@/lib/hotels/test-booking";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { formatCurrency } from "@/lib/i18n";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewPrep,
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

function validateReviewForPayment(review: NormalizedHotelReviewResult): string[] {
  const missing: string[] = [];
  if (!review.bookingId) missing.push("bookingId");
  if (!review.correlationId) missing.push("correlationId");
  if (!review.option?.optionId) missing.push("optionId");
  if (!review.reviewHash) missing.push("reviewHash");
  if (!review.tjHotelId) missing.push("tjHotelId/hid");
  if (!review.option?.pricing?.totalPrice) missing.push("finalPrice");
  return missing;
}

async function refreshReviewIfNeeded(
  review: NormalizedHotelReviewResult
): Promise<NormalizedHotelReviewResult> {
  if (review.bookingId && review.reviewHash) return review;

  const prep = loadHotelReviewPrep();
  if (!prep?.correlationId || !prep.reviewHash || !prep.selectedOptionId || !prep.hotelId) {
    return review;
  }

  const res = await fetch("/api/hotels/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correlationId: prep.correlationId,
      optionId: prep.selectedOptionId,
      reviewHash: prep.reviewHash,
      hid: prep.hotelId,
      hotelName: prep.hotelName,
      searchContext: prep.searchContext,
    }),
  });

  const text = await res.text();
  let json: { success?: boolean; data?: { review?: NormalizedHotelReviewResult }; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`Review refresh returned non-JSON (HTTP ${res.status})`);
  }

  if (!json.success || !json.data?.review) {
    throw new Error(json.error ?? "Failed to refresh hotel review before payment");
  }

  const refreshed = {
    ...json.data.review,
    reviewHash: prep.reviewHash,
  };
  sessionStorage.setItem("tripjack_hotel_review_response", JSON.stringify(refreshed));
  return refreshed;
}

export function HotelPaymentClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useHotelBookingApi();

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [guestDetails, setGuestDetails] = useState<HotelGuestDetailsForm | null>(null);
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [lastApiError, setLastApiError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [priceChange, setPriceChange] = useState<{
    previousPrice: number;
    currentPrice: number;
    currency: string;
    booking: HotelBookingRecord;
  } | null>(null);

  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;
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

  const canPay = Boolean(
    review?.bookingId && review.option?.pricing?.totalPrice && !priceChange && !api.loading
  );

  useEffect(() => {
    void (async () => {
      if (isHotelSearchSessionExpired()) {
        setSessionError("Hotel session expired. Please search again.");
        setReady(true);
        return;
      }

      const loadedGuests = loadGuestDetails();
      let loadedReview = loadHotelReviewResult();

      if (!loadedReview || !loadedGuests) {
        setSessionError("Guest details missing. Please complete the guest form.");
        setReady(true);
        return;
      }

      const normalizedGuests = normalizeGuestDetailsForm(loadedGuests, {
        panRequired: loadedReview.option.panRequired,
        passportRequired: loadedReview.option.passportRequired,
      });

      try {
        loadedReview = await refreshReviewIfNeeded(loadedReview);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Review refresh failed";
        setLastApiError(message);
      }

      const missing = validateReviewForPayment(loadedReview);
      setMissingFields(missing);

      setReview(loadedReview);
      setGuestDetails(normalizedGuests);

      if (missing.length) {
        setSessionError(
          `Cannot proceed to payment. Missing: ${missing.join(", ")}. Please go back to Review and try again.`
        );
        setReady(true);
        return;
      }

      const reviewPrep = loadHotelReviewPrep();
      const prepared = await api.prepareBooking({
        review: loadedReview,
        guestDetails: normalizedGuests,
        reviewHash: loadedReview.reviewHash ?? reviewPrep?.reviewHash,
      });

      if (prepared) {
        setBooking(prepared);
      } else if (api.error) {
        setLastApiError(api.error);
      }

      setReady(true);
    })();
  }, []);

  const finish = (result: {
    booking: HotelBookingRecord;
    manualReview?: boolean;
    message?: string;
    testMode?: boolean;
    loginCredentials?: { loginEmail: string; loginPassword: string } | null;
  }) => {
    sessionStorage.setItem("tripjack_hotel_confirmed_booking", JSON.stringify(result.booking));
    if (result.loginCredentials) {
      sessionStorage.setItem(
        "tripjack_hotel_login_credentials",
        JSON.stringify(result.loginCredentials)
      );
    }
    if (result.manualReview) {
      toast.info(
        result.message ?? "Payment received. Booking is pending with supplier — we will notify you shortly.",
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

  const handlePay = async (priceConfirmed = false) => {
    if (!review || !guestDetails) return;

    let activeBooking = booking;
    if (!activeBooking) {
      const reviewPrep = loadHotelReviewPrep();
      activeBooking =
        (await api.prepareBooking({
          review,
          guestDetails,
          reviewHash: review.reviewHash ?? reviewPrep?.reviewHash,
        })) ?? null;
      if (activeBooking) setBooking(activeBooking);
    }

    if (!activeBooking) {
      toast.error(api.error ?? "Could not prepare booking for payment");
      return;
    }

    const pg = guestDetails.primaryGuest;
    const result = await api.payForBooking(
      activeBooking,
      {
        name: `${pg.firstName} ${pg.lastName}`.trim(),
        email: pg.email,
        phone: pg.mobile,
      },
      { isStaff, priceConfirmed }
    );
    if (!result) return;

    if ("priceChangeRequired" in result && result.priceChangeRequired) {
      setPriceChange({
        previousPrice: result.previousPrice,
        currentPrice: result.currentPrice,
        currency: result.currency,
        booking: result.booking,
      });
      setBooking(result.booking);
      return;
    }

    if (!("booking" in result) || !result.booking) return;
    finish(result);
  };

  const confirmPriceChange = () => {
    setPriceChange(null);
    void handlePay(true);
  };

  const handleSimulate = async () => {
    let activeBooking = booking;
    if (!activeBooking && review && guestDetails) {
      const reviewPrep = loadHotelReviewPrep();
      activeBooking =
        (await api.prepareBooking({
          review,
          guestDetails,
          reviewHash: review.reviewHash ?? reviewPrep?.reviewHash,
        })) ?? null;
      if (activeBooking) setBooking(activeBooking);
    }
    if (!activeBooking) {
      toast.error(api.error ?? "Prepare booking first");
      return;
    }
    const result = await api.simulatePaymentSuccess(activeBooking);
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
          {missingFields.length > 0 ? (
            <p className="mt-2 text-sm text-red-700">Missing: {missingFields.join(", ")}</p>
          ) : null}
          <Link href="/hotels/guests" className="mt-4 inline-block text-sm font-semibold" style={{ color: HOTEL_UI.action }}>
            Back to guest details
          </Link>
        </HotelCard>
      </HotelBookingLayout>
    );
  }

  const totalPrice = booking?.totalFare ?? review.option.pricing.totalPrice;
  const displayError = api.error ?? lastApiError;

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
          {displayError && (
            <div className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800 whitespace-pre-wrap">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {displayError}
            </div>
          )}

          {!booking && review.bookingId && !displayError ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Review is valid (bookingId: {review.bookingId}). Click Pay to prepare checkout and continue.
            </div>
          ) : null}

          {priceChange && (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Hotel price has changed</p>
              <p className="mt-2">
                Previous: {formatCurrency(priceChange.previousPrice, locale)} → Updated:{" "}
                <strong>{formatCurrency(priceChange.currentPrice, locale)}</strong>
              </p>
              <p className="mt-2 text-xs">Please confirm the updated amount to continue payment.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <HotelPrimaryButton className="!w-auto px-4" onClick={confirmPriceChange}>
                  Confirm &amp; pay {formatCurrency(priceChange.currentPrice, locale)}
                </HotelPrimaryButton>
                <HotelPrimaryButton
                  variant="outline"
                  className="!w-auto px-4"
                  onClick={() => router.push("/hotels/review")}
                >
                  Back to review
                </HotelPrimaryButton>
              </div>
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
            <p className="mt-1 text-xs font-mono" style={{ color: HOTEL_UI.textMuted }}>
              TripJack bookingId: {review.bookingId}
            </p>
          </HotelCard>

          {isSuperAdmin ? (
            <HotelCard>
              <button
                type="button"
                className="text-sm font-semibold"
                style={{ color: HOTEL_UI.primary }}
                onClick={() => setDebugOpen((open) => !open)}
              >
                {debugOpen ? "Hide" : "Show"} payment debug (Super Admin)
              </button>
              {debugOpen ? (
                <pre className="mt-3 max-h-96 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                  {JSON.stringify(
                    {
                      reviewBookingId: review.bookingId,
                      correlationId: review.correlationId,
                      reviewHash: review.reviewHash,
                      tjHotelId: review.tjHotelId,
                      optionId: review.option.optionId,
                      totalPrice: review.option.pricing.totalPrice,
                      preparedBookingId: booking?.bookingId ?? null,
                      preparedStatus: booking?.status ?? null,
                      missingFields,
                      lastApiError,
                      guestEmail: guestDetails.primaryGuest.email,
                    },
                    null,
                    2
                  )}
                </pre>
              ) : null}
            </HotelCard>
          ) : null}

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
                  {testMode ? " · Test mode available" : ""}
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
              <HotelPrimaryButton
                loading={api.loading}
                disabled={!canPay}
                onClick={() => void handlePay()}
              >
                Pay with Razorpay
              </HotelPrimaryButton>
              {testMode && (
                <HotelPrimaryButton
                  variant="outline"
                  className="mt-3"
                  disabled={api.loading || !review.bookingId}
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
