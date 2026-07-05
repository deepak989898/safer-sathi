"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewBookingId,
  loadHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

export default function HotelGuestsPlaceholderPage() {
  const { locale } = useAppStore();
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setExpired(isHotelSearchSessionExpired());
    setReview(loadHotelReviewResult());
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/hotels/review"
            className="mb-2 inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to review
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Guest details</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <UserRound className="mx-auto mb-4 h-12 w-12 text-[#1a4fa3]" />
          <h2 className="text-xl font-bold text-slate-900">Guest details — Phase 5</h2>
          <p className="mt-2 text-sm text-slate-600">
            Review is complete. Guest form, Razorpay payment, and Book API will be implemented in
            the next phase.
          </p>

          {expired && (
            <p className="mt-4 text-sm text-red-700">
              Your hotel session has expired. Please search again before continuing.
            </p>
          )}

          {review && !expired ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm">
              <p className="font-semibold text-slate-900">{review.hotelName}</p>
              <p className="text-slate-600">Booking ID: {loadHotelReviewBookingId() ?? review.bookingId}</p>
              <p className="mt-2 font-semibold text-[#1a4fa3]">
                {formatCurrency(review.option.pricing.totalPrice, locale)}
              </p>
            </div>
          ) : (
            !expired && (
              <p className="mt-6 text-sm text-amber-800">
                No reviewed booking found. Complete the review step first.
              </p>
            )
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/hotels/review">
              <Button variant="outline" className="rounded-xl">
                Back to review
              </Button>
            </Link>
            <Link href="/hotels/search">
              <Button className="rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]">
                New search
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
