"use client";

import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/i18n";
import { buildFlightDateStrip } from "@/lib/flights/date-fare-cache";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

function formatStripDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

interface FlightDateFareStripProps {
  selectedDate: string;
  locale: Locale;
  loading?: boolean;
  dateFareCache: Record<string, number | null | undefined>;
  loadingDates?: Record<string, boolean>;
  onSelectDate: (date: string) => void;
}

export function FlightDateFareStrip({
  selectedDate,
  locale,
  loading,
  dateFareCache,
  loadingDates = {},
  onSelectDate,
}: FlightDateFareStripProps) {
  const dates = buildFlightDateStrip(selectedDate);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
      {dates.map((date) => {
        const active = date === selectedDate;
        const minFare = dateFareCache[date];
        const dateLoading = loadingDates[date] || (loading && active);
        const hasFare = typeof minFare === "number" && minFare > 0;

        return (
          <button
            key={date}
            type="button"
            disabled={loading && active}
            onClick={() => {
              if (date !== selectedDate) onSelectDate(date);
            }}
            className={cn(
              "min-w-[88px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition",
              active
                ? "border-[#1a4fa3] bg-[#1a4fa3] text-white shadow-md"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium leading-tight",
                active ? "text-blue-100" : "text-slate-500"
              )}
            >
              {formatStripDay(date)}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-bold",
                active ? "text-white" : "text-[#1a4fa3]"
              )}
            >
              {dateLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasFare ? (
                formatCurrency(minFare, locale)
              ) : minFare === null ? (
                "—"
              ) : (
                "View"
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}
