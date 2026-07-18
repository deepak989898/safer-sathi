"use client";

import { Check, IndianRupee } from "lucide-react";
import {
  buildCancellationRuleLines,
  type CancellationSegmentRole,
} from "@/lib/tripjack-hotels/cancellation-display";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface HotelRoomCancellationRulesProps {
  option: NormalizedHotelOption;
  locale: Locale;
  className?: string;
}

function segmentClass(tone: "free" | "charge" | "info", role: CancellationSegmentRole): string {
  if (tone === "free") {
    if (role === "date") return "font-semibold text-emerald-800";
    if (role === "label") return "font-medium text-emerald-700";
    return "text-emerald-700";
  }

  if (tone === "charge") {
    if (role === "date") return "font-medium text-blue-700";
    if (role === "amount") return "font-semibold text-amber-700";
    if (role === "suffix") return "text-slate-600";
    if (role === "label") return "text-slate-500";
    return "text-slate-700";
  }

  return "text-slate-500";
}

export function HotelRoomCancellationRules({
  option,
  locale,
  className,
}: HotelRoomCancellationRulesProps) {
  const lines = buildCancellationRuleLines({
    isRefundable: option.isRefundable,
    freeCancellationUntil: option.freeCancellationUntil,
    penalties: option.penalties,
    locale,
  });

  return (
    <div className={cn("mt-2 space-y-1.5", className)}>
      {lines.map((line) => (
        <p
          key={line.key}
          className={cn(
            "flex items-start gap-1.5 text-xs leading-relaxed",
            line.tone === "free" && "text-emerald-700",
            line.tone === "charge" && "text-slate-700",
            line.tone === "info" && "text-slate-500"
          )}
        >
          {line.tone === "free" ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : line.tone === "charge" ? (
            <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          ) : null}
          <span>
            {line.segments.map((segment, index) => (
              <span key={`${line.key}-${index}`} className={segmentClass(line.tone, segment.role)}>
                {segment.text}
              </span>
            ))}
          </span>
        </p>
      ))}
    </div>
  );
}
