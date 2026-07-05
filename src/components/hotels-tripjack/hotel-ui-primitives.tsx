"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { cn } from "@/lib/utils";

export function HotelCard({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}) {
  const pad = padding === "sm" ? "p-4" : padding === "lg" ? "p-6 md:p-8" : "p-5 md:p-6";
  return (
    <div
      className={cn("border bg-white shadow-sm", pad, className)}
      style={{ borderRadius: HOTEL_UI.cardRadius, borderColor: HOTEL_UI.border }}
    >
      {children}
    </div>
  );
}

export function HotelPrimaryButton({
  children,
  className,
  loading,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "outline" | "success";
}) {
  const styles =
    variant === "outline"
      ? {
          backgroundColor: "white",
          color: HOTEL_UI.action,
          border: `1px solid ${HOTEL_UI.action}`,
        }
      : variant === "success"
        ? { backgroundColor: HOTEL_UI.success, color: "white" }
        : { backgroundColor: HOTEL_UI.action, color: "white" };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 w-full items-center justify-center px-4 text-sm font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ ...styles, borderRadius: HOTEL_UI.btnRadius }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function HotelFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[11px] font-bold uppercase tracking-wide"
      style={{ color: HOTEL_UI.textMuted }}
    >
      {children}
    </span>
  );
}

export function HotelStatusBadge({
  status,
  className,
}: {
  status: "confirmed" | "pending" | "cancelled" | "default";
  className?: string;
}) {
  const map = {
    confirmed: { bg: "#E7F6E7", color: HOTEL_UI.success, label: "CONFIRMED" },
    pending: { bg: "#FFF8E6", color: "#9A7200", label: "PENDING" },
    cancelled: { bg: "#FEE2E2", color: "#B91C1C", label: "CANCELLED" },
    default: { bg: "#E8F4FD", color: HOTEL_UI.primary, label: "ACTIVE" },
  };
  const s = map[status];
  return (
    <span
      className={cn("inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide", className)}
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: HOTEL_UI.btnRadius }}
    >
      {s.label}
    </span>
  );
}

export function HotelInfoBanner({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "warning" | "success";
}) {
  const bg =
    variant === "warning" ? "#FFF8E6" : variant === "success" ? "#E7F6E7" : "#E8F4FD";
  const color =
    variant === "warning" ? "#9A7200" : variant === "success" ? HOTEL_UI.success : HOTEL_UI.primary;
  return (
    <div
      className="border px-4 py-3 text-sm"
      style={{ backgroundColor: bg, borderColor: HOTEL_UI.border, color, borderRadius: HOTEL_UI.cardRadius }}
    >
      {children}
    </div>
  );
}

export function HotelPriceSummary({
  lines,
  total,
  totalLabel = "Total",
  footer,
}: {
  lines: Array<{ label: string; value: string; highlight?: boolean }>;
  total: string;
  totalLabel?: string;
  footer?: ReactNode;
}) {
  return (
    <HotelCard className="sticky top-6 h-fit">
      <h3 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
        Price Summary
      </h3>
      <div className="mt-4 space-y-2 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-4">
            <span style={{ color: HOTEL_UI.textMuted }}>{line.label}</span>
            <span
              className={line.highlight ? "font-semibold" : ""}
              style={{ color: line.highlight ? HOTEL_UI.success : HOTEL_UI.text }}
            >
              {line.value}
            </span>
          </div>
        ))}
        <div
          className="flex justify-between border-t pt-3 text-lg font-bold"
          style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.primary }}
        >
          <span>{totalLabel}</span>
          <span>{total}</span>
        </div>
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </HotelCard>
  );
}

export function HotelStepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{
              backgroundColor: i <= current ? HOTEL_UI.action : "#CBD5E1",
            }}
          >
            {i + 1}
          </span>
          <span style={{ color: i <= current ? HOTEL_UI.primary : HOTEL_UI.textMuted }}>{step}</span>
          {i < steps.length - 1 ? (
            <span className="mx-1 text-slate-300">→</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
