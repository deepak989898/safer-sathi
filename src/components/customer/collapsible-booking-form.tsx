"use client";

import { Calendar, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CollapsibleBookingFormProps {
  locale: "en" | "hi";
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  payNow: number;
  submitting?: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  scrollTargetId?: string;
  submitClassName?: string;
  children: React.ReactNode;
}

export function CollapsibleBookingForm({
  locale,
  expanded,
  onExpandedChange,
  payNow,
  submitting = false,
  submitDisabled = false,
  onSubmit,
  scrollTargetId,
  submitClassName,
  children,
}: CollapsibleBookingFormProps) {
  const expand = () => {
    onExpandedChange(true);
    if (scrollTargetId) {
      requestAnimationFrame(() => {
        document
          .getElementById(scrollTargetId)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  if (!expanded) {
    return (
      <Button className="w-full" size="lg" onClick={expand}>
        <Calendar className="mr-2 h-4 w-4" />
        {t(locale, "common", "bookNow")} · {formatCurrency(payNow, locale)}
      </Button>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#0c2444]">Booking details</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-muted-foreground"
          onClick={() => onExpandedChange(false)}
        >
          <ChevronUp className="mr-1 h-4 w-4" />
          {locale === "hi" ? "बंद करें" : "Close"}
        </Button>
      </div>

      <div className="space-y-4">{children}</div>

      <Button
        type="button"
        className={cn("w-full", submitClassName)}
        size="lg"
        disabled={submitDisabled || submitting}
        onClick={onSubmit}
      >
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Calendar className="mr-2 h-4 w-4" />
        )}
        {t(locale, "common", "bookNow")} · {formatCurrency(payNow, locale)}
      </Button>
    </div>
  );
}
