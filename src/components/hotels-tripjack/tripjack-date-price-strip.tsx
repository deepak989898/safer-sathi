"use client";

import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types";

export interface TripJackDateStripItem {
  checkIn: string;
  dayLabel: string;
  dateLabel: string;
  minPrice: number | null;
  loading?: boolean;
}

interface TripJackDatePriceStripProps {
  dates: TripJackDateStripItem[];
  selectedCheckIn: string;
  onSelect: (checkIn: string) => void;
  locale: Locale;
  className?: string;
}

export function TripJackDatePriceStrip({
  dates,
  selectedCheckIn,
  onSelect,
  locale,
  className,
}: TripJackDatePriceStripProps) {
  if (!dates.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Select check-in date · live prices for 1 night
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {dates.map((item) => {
          const selected = item.checkIn === selectedCheckIn;
          return (
            <button
              key={item.checkIn}
              type="button"
              onClick={() => onSelect(item.checkIn)}
              className={cn(
                "flex min-w-[5.5rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-center transition",
                selected
                  ? "border-[#1a4fa3] bg-[#eaf2ff] text-[#0f4aa8] shadow-sm ring-1 ring-[#1a4fa3]/20"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                {item.dayLabel}
              </span>
              <span className="text-sm font-bold leading-tight">{item.dateLabel}</span>
              <span
                className={cn(
                  "mt-1 flex min-h-[1rem] items-center justify-center text-[10px] leading-tight",
                  selected ? "text-[#0f4aa8]/80" : "text-muted-foreground"
                )}
              >
                {item.loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : item.minPrice && item.minPrice > 0 ? (
                  <>From {formatCurrency(item.minPrice, locale)}</>
                ) : (
                  "Check price"
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
