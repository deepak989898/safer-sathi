"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelSessionCountdown } from "@/components/hotels-tripjack/hotel-session-countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
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
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={detailHref}
              className="mb-2 inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to hotel details
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Review your booking</h1>
          </div>
          <HotelSessionCountdown />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        {loading && <ReviewSkeleton />}

        {error && !loading && (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="font-semibold text-slate-900">Review could not be completed</p>
            <p className="mt-2 text-sm text-red-700">{error.message}</p>
            {isSuperAdmin && error.adminMessage && (
              <p className="mt-2 text-xs font-medium text-violet-800">{error.adminMessage}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {error.retryable && (
                <Button
                  className="rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
                  onClick={() => void runReview()}
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Retry review
                </Button>
              )}
              {error.backToDetail && (
                <Link href={detailHref}>
                  <Button variant="outline" className="rounded-xl">
                    Choose another room
                  </Button>
                </Link>
              )}
              {error.backToSearch && (
                <Link href="/hotels/search">
                  <Button variant="outline" className="rounded-xl">
                    Search again
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {review && option && !loading && !error && (
          <div className="space-y-5">
            {isSuperAdmin && adminDebug && (
              <HotelPricingDebugPanel
                requestBody={adminDebug.requestBody}
                rawResponse={adminDebug.rawResponse}
              />
            )}

            <div className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Review confirmed
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{review.hotelName}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Booking reference:{" "}
                    <span className="font-mono font-medium text-slate-800">{review.bookingId}</span>
                  </p>
                </div>
                <Badge className="border-0 bg-emerald-50 text-emerald-700">Price locked</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Check-in {review.searchContext.checkIn}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Check-out {review.searchContext.checkOut}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {nights} night{nights === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {guestSummary(review.searchContext.rooms)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Selected room</h3>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {option.roomInfo[0] || option.roomName}
              </p>
              {option.roomInfo.length > 1 && (
                <p className="text-sm text-slate-600">{option.roomInfo.slice(1).join(" · ")}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {option.optionType && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {option.optionType}
                  </Badge>
                )}
                <Badge className="border-0 bg-blue-50 text-[#1a4fa3]">{option.mealBasisLabel}</Badge>
                <Badge
                  className={
                    option.isRefundable
                      ? "border-0 bg-emerald-50 text-emerald-700"
                      : "border-0 bg-red-50 text-red-700"
                  }
                >
                  {option.isRefundable ? "Refundable" : "Non Refundable"}
                </Badge>
                {option.panRequired && (
                  <Badge className="border-0 bg-amber-50 text-amber-800">PAN Required</Badge>
                )}
                {option.passportRequired && (
                  <Badge className="border-0 bg-amber-50 text-amber-800">Passport Required</Badge>
                )}
              </div>

              {option.inclusions.length > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Inclusions:</span>{" "}
                  {option.inclusions.join(", ")}
                </p>
              )}

              {option.bookingNotes.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-950">
                  <p className="mb-1 font-semibold">Booking notes</p>
                  {option.bookingNotes.map((note) => (
                    <p key={note}>• {note}</p>
                  ))}
                </div>
              )}
            </div>

            <HotelCancellationTimeline
              isRefundable={option.isRefundable}
              freeCancellationUntil={option.freeCancellationUntil}
              penalties={option.penalties}
              locale={locale}
            />

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">Final price</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base price</span>
                  <span>{formatCurrency(option.pricing.basePrice, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes</span>
                  <span>{formatCurrency(option.pricing.taxes, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Management fee</span>
                  <span>{formatCurrency(option.pricing.mf, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Management fee tax</span>
                  <span>{formatCurrency(option.pricing.mft, locale)}</span>
                </div>
                {option.pricing.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatCurrency(option.pricing.discount, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-[#1a4fa3]">
                  <span>Total payable</span>
                  <span>{formatCurrency(option.pricing.totalPrice, locale)}</span>
                </div>
                <p className="text-xs text-slate-500">{option.pricing.currency}</p>
              </div>
            </div>

            {review.deadlineDateTime && (
              <p className="text-center text-xs text-slate-500">
                Complete booking before {review.deadlineDateTime}
                {review.onHoldAllowed ? " · Hold booking available" : ""}
              </p>
            )}

            <Button
              className="h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#16408a]"
              onClick={() => router.push("/hotels/guests")}
            >
              Continue to Guest Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
