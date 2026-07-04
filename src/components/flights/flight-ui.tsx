"use client";

import Link from "next/link";
import { ArrowLeft, Check, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export const FLIGHT_BLUE = "#1a4fa3";
export const FLIGHT_BLUE_HOVER = "#16408a";

export const FLIGHT_STEPS = [
  { id: "search", label: "Search" },
  { id: "results", label: "Results" },
  { id: "review", label: "Review" },
  { id: "passengers", label: "Passengers" },
  { id: "payment", label: "Payment" },
  { id: "ticket", label: "Ticket" },
] as const;

export type FlightStepId = (typeof FLIGHT_STEPS)[number]["id"];

export function FlightStepBar({ current }: { current: FlightStepId }) {
  const currentIndex = FLIGHT_STEPS.findIndex((s) => s.id === current);

  return (
    <div className="overflow-x-auto border-b border-blue-100 bg-white">
      <div className="container mx-auto flex min-w-[520px] items-center gap-1 px-4 py-3">
        {FLIGHT_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-[#1a4fa3] text-white",
                  !done && !active && "bg-slate-100 text-slate-400"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  active ? "text-[#1a4fa3]" : done ? "text-emerald-700" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
              {index < FLIGHT_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px min-w-[12px] flex-1",
                    index < currentIndex ? "bg-emerald-400" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FlightPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="border-b bg-gradient-to-r from-[#1a4fa3] to-[#2563c9] text-white">
      <div className="container mx-auto px-4 py-5 md:py-6">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center text-sm text-blue-100 hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-blue-100">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AirlineAvatar({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-bold text-[#1a4fa3] shadow-sm ring-1 ring-blue-100",
        className
      )}
    >
      {(code || "FL").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function FlightRouteStrip({
  departureTime,
  arrivalTime,
  fromCode,
  toCode,
  fromCity,
  toCity,
  duration,
  stopsLabel,
}: {
  departureTime: string;
  arrivalTime: string;
  fromCode: string;
  toCode: string;
  fromCity?: string;
  toCity?: string;
  duration: string;
  stopsLabel: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div>
        <p className="text-xl font-bold text-slate-900 md:text-2xl">{departureTime}</p>
        <p className="text-sm font-semibold text-slate-800">{fromCode}</p>
        {fromCity && <p className="truncate text-xs text-slate-500">{fromCity}</p>}
      </div>
      <div className="flex min-w-[88px] flex-col items-center px-1 text-center">
        <p className="text-[11px] font-medium text-slate-500">{duration}</p>
        <div className="my-1.5 flex w-full items-center gap-1">
          <span className="h-px flex-1 bg-slate-300" />
          <Plane className="h-3.5 w-3.5 text-[#1a4fa3]" />
          <span className="h-px flex-1 bg-slate-300" />
        </div>
        <p className="text-[11px] font-semibold text-slate-600">{stopsLabel}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold text-slate-900 md:text-2xl">{arrivalTime}</p>
        <p className="text-sm font-semibold text-slate-800">{toCode}</p>
        {toCity && <p className="truncate text-xs text-slate-500">{toCity}</p>}
      </div>
    </div>
  );
}

export function FlightSuccessPanel({
  title,
  description,
  children,
  tone = "success",
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  tone?: "success" | "info" | "warning";
}) {
  const ring =
    tone === "success"
      ? "bg-emerald-100 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-100 text-amber-600"
        : "bg-blue-100 text-[#1a4fa3]";

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
      <div
        className={cn(
          "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
          ring
        )}
      >
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      {children}
    </div>
  );
}

export function FlightSoftCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function flightPrimaryButtonClass(extra?: string) {
  return cn(
    "h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold text-white shadow-md shadow-blue-900/10 hover:bg-[#16408a]",
    extra
  );
}
