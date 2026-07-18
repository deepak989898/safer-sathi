"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  buildCancellationRuleLines,
  formatCancellationDateRange,
  formatCancellationDateTime,
} from "@/lib/tripjack-hotels/cancellation-display";
import { formatCurrency } from "@/lib/i18n";
import type { CancellationPenalty } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface HotelCancellationTimelineProps {
  isRefundable: boolean;
  freeCancellationUntil: string;
  penalties: CancellationPenalty[];
  locale: Locale;
  /** Nest inside another card without outer border/padding */
  embedded?: boolean;
}

export function HotelCancellationTimeline({
  isRefundable,
  freeCancellationUntil,
  penalties,
  locale,
  embedded = false,
}: HotelCancellationTimelineProps) {
  const freePenalty = penalties.find((p) => p.amount === 0);
  const chargePenalties = penalties.filter((p) => p.amount > 0);
  const freeUntil = freeCancellationUntil || freePenalty?.to || freePenalty?.from || "";
  const compactLines = buildCancellationRuleLines({
    isRefundable,
    freeCancellationUntil: freeUntil,
    penalties,
    locale,
  });

  const body = (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${embedded ? "mb-2" : "mb-3"}`}>
        <p className={`font-semibold text-slate-900 ${embedded ? "text-sm" : ""}`}>
          Cancellation policy
        </p>
        <Badge
          className={
            isRefundable
              ? "border-0 bg-emerald-50 text-emerald-700"
              : "border-0 bg-red-50 text-red-700"
          }
        >
          {isRefundable ? "Refundable" : "Non Refundable"}
        </Badge>
      </div>

      {isRefundable && freeUntil ? (
        <div className="space-y-0">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center rounded-full bg-emerald-500 text-white ${
                  embedded ? "h-6 w-6" : "h-7 w-7"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </div>
              {(chargePenalties.length > 0 || penalties.length > 1) && (
                <div className="my-1 min-h-[20px] w-px flex-1 bg-slate-200" />
              )}
            </div>
            <div className={chargePenalties.length > 0 ? "pb-3" : ""}>
              <p className="text-sm font-medium text-emerald-700">Free cancellation until</p>
              <p className="text-sm text-slate-700">{formatCancellationDateTime(freeUntil, locale)}</p>
            </div>
          </div>

          {chargePenalties.map((penalty, index) => (
            <div key={`${penalty.from}-${penalty.to}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 ${
                    embedded ? "h-6 w-6" : "h-7 w-7"
                  }`}
                >
                  ₹
                </div>
                {index < chargePenalties.length - 1 && (
                  <div className="my-1 min-h-[20px] w-px flex-1 bg-slate-200" />
                )}
              </div>
              <div className={index < chargePenalties.length - 1 ? "pb-3" : ""}>
                <p className="text-sm font-medium text-slate-800">
                  {penalty.from || penalty.to
                    ? formatCancellationDateRange(penalty.from, penalty.to, locale)
                    : "Penalty slab"}
                </p>
                <p className="text-sm text-slate-700">
                  {formatCurrency(penalty.amount, locale)} cancellation charge
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : compactLines.length > 0 ? (
        <ul className={`space-y-1.5 text-slate-700 ${embedded ? "text-xs" : "text-sm"}`}>
          {compactLines.map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
      ) : penalties.length > 0 ? (
        <ul className={`space-y-1.5 text-slate-700 ${embedded ? "text-xs" : "text-sm"}`}>
          {penalties.map((p, i) => (
            <li key={i}>{p.label}</li>
          ))}
        </ul>
      ) : (
        <p className={`text-slate-600 ${embedded ? "text-xs" : "text-sm"}`}>
          {isRefundable
            ? "Refundable rate. Check final policy at booking."
            : "This rate is non-refundable."}
        </p>
      )}

      <p className={`text-slate-500 ${embedded ? "mt-2 text-[10px]" : "mt-3 text-xs"}`}>
        All times are in IST (GMT+5:30).
      </p>
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">{body}</div>;
}
