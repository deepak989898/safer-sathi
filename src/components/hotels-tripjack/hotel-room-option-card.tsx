"use client";

import { Check } from "lucide-react";
import { HotelRoomCancellationRules } from "@/components/hotels-tripjack/hotel-room-cancellation-rules";
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
  /** Highlight this room as selected (card body click). */
  onSelect: (optionId: string) => void;
  /** If already selected → continue; otherwise select first. */
  onConfirm: (optionId: string) => void;
}

export function HotelRoomOptionCard({
  option,
  selected,
  locale,
  onSelect,
  onConfirm,
}: HotelRoomOptionCardProps) {
  const p = option.pricing;
  const roomTitle = option.roomInfo[0] || option.roomName;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(option.optionId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(option.optionId);
        }
      }}
      className={cn(
        "cursor-pointer border bg-white p-4 shadow-sm transition md:p-5",
        selected ? "" : "hover:border-[#006CE4]/60"
      )}
      style={{
        borderRadius: HOTEL_UI.cardRadius,
        borderColor: selected ? HOTEL_UI.action : HOTEL_UI.border,
        boxShadow: selected ? `0 0 0 2px ${HOTEL_UI.action}33` : undefined,
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
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
          <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
            {option.mealBasisLabel}
            {option.isRefundable ? "" : " · Non-refundable"}
          </p>
          <HotelRoomCancellationRules option={option} locale={locale} />
          {option.inclusions.length > 0 && (
            <p className="mt-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
              {option.inclusions.slice(0, 4).join(" · ")}
            </p>
          )}
        </div>

        <div
          className="shrink-0 p-4 lg:w-52"
          style={{ backgroundColor: "#FAFBFC", borderRadius: HOTEL_UI.cardRadius }}
        >
          <p className="text-2xl font-bold" style={{ color: HOTEL_UI.primary }}>
            {formatCurrency(p.totalPrice, locale)}
          </p>
          <p className="text-[10px]" style={{ color: HOTEL_UI.textMuted }}>
            Total price for 1 room · incl. taxes · {p.currency}
          </p>
          <div className="mt-3">
            <HotelPrimaryButton
              className="!h-10 text-xs"
              variant={selected ? "primary" : "outline"}
              onClick={(event) => {
                event.stopPropagation();
                onConfirm(option.optionId);
              }}
            >
              {selected ? "Continue" : "Select"}
            </HotelPrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
