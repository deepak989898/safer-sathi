"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelInfoBanner,
  HotelPrimaryButton,
  HotelPriceSummary,
  HotelStepBar,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { formatCurrency } from "@/lib/i18n";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewPrep,
  saveHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type {
  HotelReviewPrepSession,
  NormalizedHotelReviewResult,
} from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

interface ReviewErrorState {
  message: string;
  code?: string;
  backToSearch?: boolean;
  backToDetail?: boolean;
  retryable?: boolean;
  adminMessage?: string;
}

function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function guestSummary(rooms: HotelReviewPrepSession["searchContext"]["rooms"]): string {
  let adults = 0;
  let children = 0;
  for (const room of rooms) {
    adults += Number(room.adults) || 0;
    children += Number(room.children) || 0;
  }
  return `${rooms.length} room${rooms.length === 1 ? "" : "s"} · ${adults} adult${adults === 1 ? "" : "s"}${children > 0 ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}`;
}

export function HotelReviewClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReviewErrorState | null>(null);
  const [prep, setPrep] = useState<HotelReviewPrepSession | null>(null);
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [adminDebug, setAdminDebug] = useState<{ requestBody: unknown; rawResponse: unknown } | null>(
    null
  );

  const detailHref = prep?.hotelId
    ? `/hotels/detail/${encodeURIComponent(String(prep.hotelId))}`
    : "/hotels/results";

  const runReview = useCallback(async () => {
    if (isHotelSearchSessionExpired()) {
      setError({ message: "Session expired. Please search hotels again.", backToSearch: true });
      setLoading(false);
      return;
    }

    const sessionPrep = loadHotelReviewPrep();
    if (!sessionPrep) {
      setError({
        message: "Room selection missing. Please select a room from hotel details.",
        backToDetail: true,
      });
      setLoading(false);
      return;
    }

    setPrep(sessionPrep);

    const { correlationId, reviewHash, selectedOptionId, hotelId, hotelName, searchContext } =
      sessionPrep;

    if (!correlationId || !reviewHash || !selectedOptionId || !hotelId) {
      toast.error("Booking session incomplete. Please search again.");
      router.push("/hotels/search");
      return;
    }

    setLoading(true);
    setError(null);
    setAdminDebug(null);

    try {
      const body = {
        correlationId,
        optionId: selectedOptionId,
        reviewHash,
        hid: hotelId,
        hotelName,
        searchContext,
      };

      if (isStaff) console.log("[hotel-review] request", body);

      const res = await fetch("/api/hotels/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        setError({
          message: json.error ?? "Hotel review failed",
          code: json.details?.code,
          backToSearch: Boolean(json.details?.backToSearch),
          backToDetail: Boolean(json.details?.backToDetail),
          retryable: Boolean(json.details?.retryable),
          adminMessage: isSuperAdmin ? json.details?.adminMessage : undefined,
        });
        return;
      }

      const reviewed = json.data.review as NormalizedHotelReviewResult;
      saveHotelReviewResult(reviewed);
      setReview(reviewed);

      if (isSuperAdmin && json.data.adminDebug) {
        setAdminDebug(json.data.adminDebug);
      }

      if (isStaff) {
        console.log("[hotel-review] success", {
          bookingId: reviewed.bookingId,
          totalPrice: reviewed.option.pricing.totalPrice,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Hotel review failed";
      setError({ message, retryable: true });
    } finally {
      setLoading(false);
    }
  }, [isStaff, isSuperAdmin, router]);

  useEffect(() => {
    void runReview();
  }, [runReview]);

  const nights = useMemo(() => {
    if (!review) return 0;
    return countNights(review.searchContext.checkIn, review.searchContext.checkOut);
  }, [review]);

  const option = review?.option;

  return (
    <HotelBookingLayout
      title="Review Booking"
      subtitle={review?.hotelName}
      backHref={detailHref}
      backLabel="Back to hotel details"
      showCountdown
      maxWidth="xl"
    >
      <HotelStepBar steps={["Search", "Select Room", "Review", "Guests", "Payment"]} current={2} />

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded bg-slate-200" />
          <div className="h-48 rounded bg-slate-200" />
        </div>
      )}

      {error && !loading && (
        <HotelCard className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            Review could not be completed
          </p>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {error.retryable && (
              <HotelPrimaryButton className="!w-auto px-6" onClick={() => void runReview()}>
                Retry review
              </HotelPrimaryButton>
            )}
            {error.backToDetail && (
              <Link href={detailHref}>
                <HotelPrimaryButton variant="outline" className="!w-auto px-6">
                  Choose another room
                </HotelPrimaryButton>
              </Link>
            )}
          </div>
        </HotelCard>
      )}

      {review && option && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {isSuperAdmin && adminDebug && (
              <HotelPricingDebugPanel
                requestBody={adminDebug.requestBody}
                rawResponse={adminDebug.rawResponse}
              />
            )}

            <HotelCard>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: HOTEL_UI.success }}>
                Review confirmed · Price locked
              </p>
              <h2 className="mt-1 text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
                {review.hotelName}
              </h2>
              <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                Ref: <span className="font-mono">{review.bookingId}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
                  {review.searchContext.checkIn} → {review.searchContext.checkOut}
                </span>
                <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
                  {nights} night{nights === 1 ? "" : "s"}
                </span>
                <span className="rounded px-2 py-1" style={{ backgroundColor: "#F5F7FA" }}>
                  {guestSummary(review.searchContext.rooms)}
                </span>
              </div>
            </HotelCard>

            <HotelCard>
              <h3 className="font-bold" style={{ color: HOTEL_UI.primary }}>
                Hotel &amp; Room Details
              </h3>
              <p className="mt-2 text-lg font-semibold">{option.roomInfo[0] || option.roomName}</p>
              <p className="text-sm" style={{ color: HOTEL_UI.textMuted }}>
                {option.mealBasisLabel} · {option.isRefundable ? "Refundable" : "Non-refundable"}
              </p>
              {option.inclusions.length > 0 && (
                <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  Inclusions: {option.inclusions.join(", ")}
                </p>
              )}
            </HotelCard>

            <HotelCancellationTimeline
              isRefundable={option.isRefundable}
              freeCancellationUntil={option.freeCancellationUntil}
              penalties={option.penalties}
              locale={locale}
            />
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
                <HotelPrimaryButton onClick={() => router.push("/hotels/guests")}>
                  Continue to Guest Details
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
      )}
    </HotelBookingLayout>
  );
}
