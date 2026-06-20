"use client";

import { Label } from "@/components/ui/label";
import {
  ADVANCE_PAYMENT_PERCENT,
  calculateAdvanceAmount,
  type PaymentPlan,
} from "@/lib/payments/booking-payment";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PaymentPlanSelectorProps {
  totalAmount: number;
  value: PaymentPlan;
  onChange: (plan: PaymentPlan) => void;
  locale?: "en" | "hi";
  className?: string;
  paidAmount?: number;
}

export function PaymentPlanSelector({
  totalAmount,
  value,
  onChange,
  locale = "en",
  className,
  paidAmount = 0,
}: PaymentPlanSelectorProps) {
  const advance = calculateAdvanceAmount(totalAmount);
  const balance = Math.max(0, totalAmount - advance);
  const remaining = Math.max(0, totalAmount - paidAmount);

  if (remaining <= 0) return null;

  if (paidAmount > 0) {
    return (
      <div className={cn("rounded-lg border bg-muted/40 p-3 text-sm", className)}>
        <p className="font-medium">
          {locale === "hi" ? "बाकी राशि" : "Balance due"}:{" "}
          <span className="text-primary">{formatCurrency(remaining, locale)}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "hi"
            ? `पहले से भुगतान: ${formatCurrency(paidAmount, locale)}`
            : `Already paid: ${formatCurrency(paidAmount, locale)}`}
        </p>
      </div>
    );
  }

  const options: { id: PaymentPlan; title: string; subtitle: string }[] = [
    {
      id: "advance",
      title:
        locale === "hi"
          ? `${ADVANCE_PAYMENT_PERCENT}% अग्रिम भुगतान`
          : `Pay ${ADVANCE_PAYMENT_PERCENT}% advance`,
      subtitle:
        locale === "hi"
          ? `अभी ${formatCurrency(advance, locale)} · बाकी ${formatCurrency(balance, locale)}`
          : `Pay ${formatCurrency(advance, locale)} now · balance ${formatCurrency(balance, locale)}`,
    },
    {
      id: "full",
      title: locale === "hi" ? "पूरा भुगतान" : "Pay full amount",
      subtitle: formatCurrency(totalAmount, locale),
    },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm">
        {locale === "hi" ? "भुगतान विकल्प" : "Payment option"}
      </Label>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              value === option.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <p className="text-sm font-medium">{option.title}</p>
            <p className="text-xs text-muted-foreground">{option.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
