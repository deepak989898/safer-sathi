"use client";

import { Check, IndianRupee } from "lucide-react";
import { buildCancellationRuleLines } from "@/lib/tripjack-hotels/cancellation-display";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface HotelRoomCancellationRulesProps {
  option: NormalizedHotelOption;
  locale: Locale;
  className?: string;
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
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : line.tone === "charge" ? (
            <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : null}
          <span>{line.text}</span>
        </p>
      ))}
    </div>
  );
}
