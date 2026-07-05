"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface HotelRoomOptionCardProps {
  option: NormalizedHotelOption;
  selected: boolean;
  locale: Locale;
  onSelect: (optionId: string) => void;
}

export function HotelRoomOptionCard({
  option,
  selected,
  locale,
  onSelect,
}: HotelRoomOptionCardProps) {
  const p = option.pricing;
  const roomTitle = option.roomInfo[0] || option.roomName;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border bg-white p-4 shadow-sm transition md:p-5",
        selected ? "border-[#1a4fa3] ring-2 ring-[#1a4fa3]/20" : "border-slate-200"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{roomTitle}</h3>
            {selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1a4fa3] px-2 py-0.5 text-[10px] font-semibold text-white">
                <Check className="h-3 w-3" />
                Selected
              </span>
            )}
          </div>

          {option.roomInfo.length > 1 && (
            <p className="mt-1 text-sm text-slate-600">{option.roomInfo.slice(1).join(" · ")}</p>
          )}

          <p className="mt-1 text-sm text-slate-600">
            {option.roomType}
            {option.ratePlan ? ` · ${option.ratePlan}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
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
            {option.gstType && (
              <Badge variant="secondary" className="text-[10px]">
                GST: {option.gstType}
              </Badge>
            )}
          </div>

          {option.roomCapacity && (
            <p className="mt-2 text-sm text-slate-600">Capacity: {option.roomCapacity}</p>
          )}

          {option.roomFeatures.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              Features: {option.roomFeatures.slice(0, 5).join(", ")}
            </p>
          )}

          {option.inclusions.length > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              Inclusions: {option.inclusions.slice(0, 6).join(", ")}
            </p>
          )}

          {option.roomImages.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {option.roomImages.slice(0, 4).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-16 w-24 shrink-0 rounded-lg bg-slate-100 object-cover"
                />
              ))}
            </div>
          )}

          {option.bookingNotes.length > 0 && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
              {option.bookingNotes.slice(0, 3).map((note) => (
                <p key={note}>• {note}</p>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 rounded-2xl bg-slate-50 p-4 lg:w-60">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
          {p.strikethroughPrice != null && p.strikethroughPrice > p.totalPrice && (
            <p className="text-sm text-slate-400 line-through">
              {formatCurrency(p.strikethroughPrice, locale)}
            </p>
          )}
          <p className="text-2xl font-bold text-[#1a4fa3]">{formatCurrency(p.totalPrice, locale)}</p>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Base</span>
              <span>{formatCurrency(p.basePrice, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>{formatCurrency(p.taxes, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>Management fee</span>
              <span>{formatCurrency(p.mf, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>MF tax</span>
              <span>{formatCurrency(p.mft, locale)}</span>
            </div>
            {p.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatCurrency(p.discount, locale)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Grand total</span>
              <span>{formatCurrency(p.totalPrice, locale)}</span>
            </div>
            <p className="text-[10px] text-slate-400">{p.currency}</p>
          </div>

          <Button
            type="button"
            className={cn(
              "mt-4 h-10 w-full rounded-xl text-sm font-semibold",
              selected ? "bg-[#1a4fa3] hover:bg-[#16408a]" : "bg-slate-900 hover:bg-slate-800"
            )}
            onClick={() => onSelect(option.optionId)}
          >
            {selected ? "Selected" : "Select Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
