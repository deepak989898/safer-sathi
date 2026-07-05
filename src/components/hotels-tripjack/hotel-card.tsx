"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface HotelCardProps {
  hotel: NormalizedHotel;
  locale: Locale;
  onViewDetails: (hotel: NormalizedHotel) => void;
}

export function HotelCard({ hotel, locale, onViewDetails }: HotelCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{hotel.name}</h3>
            <Badge variant="secondary" className="font-mono text-[10px]">
              ID {hotel.tjHotelId}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge
              className={
                hotel.isRefundable
                  ? "border-0 bg-emerald-50 text-emerald-700"
                  : "border-0 bg-slate-100 text-slate-600"
              }
            >
              {hotel.isRefundable ? "Refundable" : "Non-refundable"}
            </Badge>
            {hotel.panRequired && (
              <Badge className="border-0 bg-amber-50 text-amber-800">PAN required</Badge>
            )}
            {hotel.passportRequired && (
              <Badge className="border-0 bg-amber-50 text-amber-800">Passport required</Badge>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-600">
            <span className="font-medium text-slate-800">Meal:</span> {hotel.mealBasis}
          </p>
          {hotel.inclusions.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Inclusions:</span>{" "}
              {hotel.inclusions.slice(0, 4).join(", ")}
              {hotel.inclusions.length > 4 ? "…" : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {hotel.options.length} room option{hotel.options.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="shrink-0 border-t border-slate-100 pt-4 md:w-52 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            From (total)
          </p>
          <p className="text-2xl font-bold text-[#1a4fa3]">
            {formatCurrency(hotel.cheapestTotalPrice, locale)}
          </p>
          <div className="mt-2 space-y-0.5 text-xs text-slate-500">
            <p>Base {formatCurrency(hotel.cheapestBasePrice, locale)}</p>
            <p>Taxes {formatCurrency(hotel.cheapestTaxes, locale)}</p>
            <p>MF {formatCurrency(hotel.cheapestMf, locale)}</p>
            <p>MFT {formatCurrency(hotel.cheapestMft, locale)}</p>
          </div>
          <Button
            className="mt-3 w-full rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
            size="sm"
            onClick={() => onViewDetails(hotel)}
          >
            View Rooms / Select Hotel
          </Button>
        </div>
      </div>
    </div>
  );
}
