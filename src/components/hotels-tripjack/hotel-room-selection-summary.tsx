"use client";

import { HotelCard, HotelPrimaryButton } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface HotelRoomSelectionSummaryProps {
  selectedOption: NormalizedHotelOption | null;
  locale: Locale;
  disabled?: boolean;
  onContinue: () => void;
  variant?: "sidebar" | "mobile-bar";
  className?: string;
}

export function HotelRoomSelectionSummary({
  selectedOption,
  locale,
  disabled,
  onContinue,
  variant = "sidebar",
  className,
}: HotelRoomSelectionSummaryProps) {
  const isMobileBar = variant === "mobile-bar";
  const roomTitle = selectedOption
    ? selectedOption.roomInfo[0] || selectedOption.roomName
    : null;

  const content = (
    <>
      <h3
        className={cn("font-bold", isMobileBar ? "text-sm" : "text-base")}
        style={{ color: HOTEL_UI.primary }}
      >
        {isMobileBar ? "Your selection" : "Booking summary"}
      </h3>

      {selectedOption ? (
        <div className={cn("space-y-2", isMobileBar ? "mt-2 text-xs" : "mt-4 text-sm")}>
          <div>
            <p className="font-semibold text-slate-800">{roomTitle}</p>
            <p style={{ color: HOTEL_UI.textMuted }}>{selectedOption.mealBasisLabel}</p>
            <p style={{ color: HOTEL_UI.textMuted }}>
              {selectedOption.isRefundable ? "Free cancellation" : "Non-refundable"}
            </p>
          </div>
          <div className="flex justify-between gap-3 border-t pt-2" style={{ borderColor: HOTEL_UI.border }}>
            <span style={{ color: HOTEL_UI.textMuted }}>Room total</span>
            <span className="font-semibold">
              {formatCurrency(selectedOption.pricing.totalPrice, locale)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-xs" style={{ color: HOTEL_UI.textMuted }}>
            <span>Taxes included</span>
            <span>{selectedOption.pricing.currency}</span>
          </div>
        </div>
      ) : (
        <p className={cn("text-muted-foreground", isMobileBar ? "mt-2 text-xs" : "mt-4 text-sm")}>
          Select a room to continue
        </p>
      )}

      <div className={isMobileBar ? "mt-3" : "mt-4"}>
        <HotelPrimaryButton
          className={cn(isMobileBar && "!h-10 text-sm")}
          disabled={disabled || !selectedOption}
          onClick={onContinue}
        >
          Continue to Review
        </HotelPrimaryButton>
      </div>
    </>
  );

  if (isMobileBar) {
    return (
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden",
          className
        )}
        style={{ borderColor: HOTEL_UI.border }}
      >
        {content}
      </div>
    );
  }

  return (
    <HotelCard className={cn("sticky top-24 h-fit", className)} padding="md">
      {content}
    </HotelCard>
  );
}
