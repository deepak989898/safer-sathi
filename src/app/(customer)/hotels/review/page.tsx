"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import { loadHotelReviewPrep } from "@/lib/tripjack-hotels/session";
import type { HotelReviewPrepSession } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

export default function HotelReviewPlaceholderPage() {
  const { locale } = useAppStore();
  const [prep, setPrep] = useState<HotelReviewPrepSession | null>(null);

  useEffect(() => {
    setPrep(loadHotelReviewPrep());
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href={
              prep?.hotelId
                ? `/hotels/detail?hotelId=${encodeURIComponent(String(prep.hotelId))}`
                : "/hotels/results"
            }
            className="mb-2 inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to hotel details
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Review hotel booking</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-[#1a4fa3]" />
          <h2 className="text-xl font-bold text-slate-900">
            Hotel Review API will be implemented in Phase 3.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your room selection is saved in session and ready for the Review API.
          </p>

          {prep ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm">
              <p className="font-semibold text-slate-900">{prep.hotelName}</p>
              <p className="text-slate-600">Hotel ID: {prep.hotelId}</p>
              <p className="text-slate-600">Option: {prep.selectedOptionId}</p>
              <p className="text-slate-600">
                Review hash:{" "}
                <span className="font-mono text-xs">{prep.reviewHash || "—"}</span>
              </p>
              <p className="mt-2 font-semibold text-[#1a4fa3]">
                {formatCurrency(prep.pricing.totalPrice, locale)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {prep.searchContext.checkIn} → {prep.searchContext.checkOut} ·{" "}
                {prep.mealBasis}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-amber-800">
              No room selection found. Please select a room from hotel details.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/hotels/results">
              <Button variant="outline" className="rounded-xl">
                Back to results
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
