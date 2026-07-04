"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n";
import type { CancellationPenalty } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface HotelCancellationTimelineProps {
  isRefundable: boolean;
  freeCancellationUntil: string;
  penalties: CancellationPenalty[];
  locale: Locale;
}

export function HotelCancellationTimeline({
  isRefundable,
  freeCancellationUntil,
  penalties,
  locale,
}: HotelCancellationTimelineProps) {
  const chargePenalty = penalties.find((p) => p.amount > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-semibold text-slate-900">Cancellation policy</p>
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

      {isRefundable && freeCancellationUntil ? (
        <div className="space-y-0">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="my-1 w-px flex-1 min-h-[24px] bg-slate-200" />
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-emerald-700">Free cancellation until</p>
              <p className="text-sm text-slate-700">{freeCancellationUntil}</p>
            </div>
          </div>
          {chargePenalty && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                ₹
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">After that</p>
                <p className="text-sm text-slate-700">
                  {formatCurrency(chargePenalty.amount, locale)} cancellation charge
                </p>
              </div>
            </div>
          )}
        </div>
      ) : penalties.length > 0 ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {penalties.map((p, i) => (
            <li key={i}>{p.label}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">
          {isRefundable
            ? "Refundable rate. Check final policy at booking."
            : "This rate is non-refundable."}
        </p>
      )}
    </div>
  );
}
