"use client";

import { useState } from "react";
import { Check, Route, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/i18n";
import type { Vehicle } from "@/types";
import {
  getVehicleDayInclusions,
  getVehicleKmInclusions,
  VEHICLE_MIN_KM_ROUND_TRIP,
  type VehiclePricingMode,
} from "@/lib/vehicles/pricing-policy";
import { getEffectivePricePerKm } from "@/lib/vehicles/capacity";

interface VehiclePricingPanelProps {
  vehicle: Vehicle;
  locale: "en" | "hi";
  className?: string;
  defaultMode?: VehiclePricingMode;
  showExamples?: boolean;
}

export function VehiclePricingPanel({
  vehicle,
  locale,
  className,
  defaultMode = "day",
  showExamples = true,
}: VehiclePricingPanelProps) {
  const [mode, setMode] = useState<VehiclePricingMode>(defaultMode);
  const pricePerKm = getEffectivePricePerKm(vehicle);
  const inclusions =
    mode === "day"
      ? getVehicleDayInclusions(locale, vehicle, pricePerKm)
      : getVehicleKmInclusions(locale, vehicle, pricePerKm);

  const dayExamples = [1, 3, 5];

  return (
    <div className={cn("rounded-xl border bg-primary/5 p-3 space-y-3", className)}>
      <p className="text-sm font-semibold text-primary">
        {locale === "hi" ? "कीमत और बुकिंग विकल्प" : "Pricing & booking options"}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("day")}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-left transition-colors",
            mode === "day"
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-background hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <Sun className="h-3.5 w-3.5" />
            {locale === "hi" ? "प्रति दिन" : "Per day"}
          </div>
          <p className="mt-1 text-sm font-bold">
            {formatCurrency(vehicle.pricePerDay, locale)}
            <span className="text-xs font-normal opacity-90">
              {locale === "hi" ? "/दिन" : "/day"}
            </span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("km")}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-left transition-colors",
            mode === "km"
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-background hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <Route className="h-3.5 w-3.5" />
            {locale === "hi" ? "प्रति किमी" : "Per km"}
          </div>
          <p className="mt-1 text-sm font-bold">
            {formatCurrency(pricePerKm, locale)}
            <span className="text-xs font-normal opacity-90">
              {locale === "hi" ? "/किमी" : "/km"}
            </span>
          </p>
        </button>
      </div>

      <div className="rounded-lg border bg-background/80 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {mode === "day"
            ? locale === "hi"
              ? "प्रति दिन में शामिल"
              : "Per-day inclusions"
            : locale === "hi"
              ? "प्रति किमी में शामिल"
              : "Per-km inclusions"}
        </p>
        <ul className="space-y-1.5">
          {inclusions.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs text-foreground/90">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {showExamples && mode === "day" && (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {locale === "hi" ? "प्रति दिन बुकिंग उदाहरण" : "Per-day booking examples"}
          </p>
          <div className="space-y-1.5">
            {dayExamples.map((days) => (
              <div key={days} className="flex justify-between text-xs">
                <span>
                  {formatCurrency(vehicle.pricePerDay, locale)} × {days}{" "}
                  {locale === "hi" ? "दिन" : days === 1 ? "day" : "days"}
                </span>
                <span className="font-medium">
                  {formatCurrency(vehicle.pricePerDay * days, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showExamples && mode === "km" && (
        <div className="border-t pt-3 space-y-1.5 text-xs text-muted-foreground">
          <p>
            {locale === "hi"
              ? `न्यूनतम बिलिंग: ${VEHICLE_MIN_KM_ROUND_TRIP} किमी (आना + जाना)`
              : `Minimum billing: ${VEHICLE_MIN_KM_ROUND_TRIP} km (round trip)`}
          </p>
          <p>
            {locale === "hi"
              ? `50 किमी एक तरफ़ → 100 किमी = ${formatCurrency(pricePerKm * VEHICLE_MIN_KM_ROUND_TRIP, locale)}`
              : `50 km one-way → 100 km = ${formatCurrency(pricePerKm * VEHICLE_MIN_KM_ROUND_TRIP, locale)}`}
          </p>
        </div>
      )}
    </div>
  );
}
