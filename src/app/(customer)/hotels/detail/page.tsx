"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import { loadSelectedHotelOption } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotel, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

export default function HotelDetailPlaceholderPage() {
  const { locale } = useAppStore();
  const [hotel, setHotel] = useState<NormalizedHotel | null>(null);
  const [option, setOption] = useState<NormalizedHotelOption | null>(null);

  useEffect(() => {
    const selected = loadSelectedHotelOption();
    setHotel(selected.hotel);
    setOption(selected.option);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/hotels/results"
            className="mb-2 inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to results
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Hotel details</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-[#1a4fa3]" />
          <h2 className="text-xl font-bold text-slate-900">
            Hotel detail/pricing will be implemented in Phase 2.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Phase 1 only lists hotels from TripJack. Detail and pricing APIs come next.
          </p>

          {hotel && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm">
              <p className="font-semibold text-slate-900">{hotel.name}</p>
              <p className="text-slate-600">Hotel ID: {hotel.tjHotelId}</p>
              {option && (
                <>
                  <p className="mt-2 text-slate-600">Option: {option.optionId}</p>
                  <p className="font-semibold text-[#1a4fa3]">
                    {formatCurrency(option.pricing.totalPrice, locale)}
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    <p>Base {formatCurrency(option.pricing.basePrice, locale)}</p>
                    <p>Taxes {formatCurrency(option.pricing.taxes, locale)}</p>
                    <p>MF {formatCurrency(option.pricing.mf, locale)}</p>
                    <p>MFT {formatCurrency(option.pricing.mft, locale)}</p>
                  </div>
                </>
              )}
            </div>
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
