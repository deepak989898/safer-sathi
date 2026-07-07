"use client";

import { Check } from "lucide-react";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { HotelPrimaryButton } from "@/components/hotels-tripjack/hotel-ui-primitives";
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
        "border bg-white p-3 shadow-sm transition sm:p-4",
        selected && "ring-2 ring-[#006CE4]/20"
      )}
      style={{
        borderRadius: HOTEL_UI.cardRadius,
        borderColor: selected ? HOTEL_UI.action : HOTEL_UI.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold sm:text-base" style={{ color: HOTEL_UI.primary }}>
              {roomTitle}
            </h3>
            {selected && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: HOTEL_UI.action, borderRadius: HOTEL_UI.btnRadius }}
              >
                <Check className="h-3 w-3" />
                Selected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: HOTEL_UI.textMuted }}>
            {option.mealBasisLabel} · {option.isRefundable ? "Free cancellation" : "Non-refundable"}
          </p>
          {option.inclusions.length > 0 && (
            <p className="mt-1 line-clamp-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
              {option.inclusions.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold sm:text-xl" style={{ color: HOTEL_UI.primary }}>
            {formatCurrency(p.totalPrice, locale)}
          </p>
          <p className="text-[10px]" style={{ color: HOTEL_UI.textMuted }}>
            incl. taxes · {p.currency}
          </p>
          <div className="mt-2">
            <HotelPrimaryButton
              className="!h-9 !w-auto min-w-[88px] px-3 text-xs"
              variant={selected ? "primary" : "outline"}
              onClick={() => onSelect(option.optionId)}
            >
              {selected ? "Selected" : "Select"}
            </HotelPrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
