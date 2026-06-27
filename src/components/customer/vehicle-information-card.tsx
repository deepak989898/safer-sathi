import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import {
  getVehicleDayInclusions,
  getVehicleKmInclusions,
  VEHICLE_MIN_KM_ROUND_TRIP,
  type VehiclePricingMode,
} from "@/lib/vehicles/pricing-policy";
import { getEffectivePricePerKm } from "@/lib/vehicles/capacity";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types";

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("max-w-[58%] text-right font-medium text-[#0c2444]", className)}>
        {value}
      </span>
    </div>
  );
}

interface VehicleInformationCardProps {
  vehicle: Vehicle;
  locale: "en" | "hi";
  bookingMode: VehiclePricingMode;
  categoryLabel: string;
  days?: number;
  billableKm?: number;
  className?: string;
}

export function VehicleInformationCard({
  vehicle,
  locale,
  bookingMode,
  categoryLabel,
  days = 1,
  billableKm = 0,
  className,
}: VehicleInformationCardProps) {
  const pricePerKm = getEffectivePricePerKm(vehicle);
  const inclusions =
    bookingMode === "day"
      ? getVehicleDayInclusions(locale, vehicle, pricePerKm)
      : getVehicleKmInclusions(locale, vehicle, pricePerKm);

  const estimatedTotal =
    bookingMode === "day"
      ? vehicle.pricePerDay * days
      : pricePerKm * billableKm;

  return (
    <Card className={cn("sticky top-24", className)}>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold">Vehicle Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4 text-sm">
        <InfoRow label="Seats" value={`${vehicle.seats} passengers`} />
        <InfoRow label="Fuel Type" value={vehicle.fuelType} />
        <InfoRow label="Category" value={categoryLabel} className="capitalize" />
        <InfoRow
          label="Driver"
          value={vehicle.driverIncluded ? "Included" : "On request"}
        />
        <InfoRow label="Location" value={vehicle.location} />
        <InfoRow
          label="Pricing Plan"
          value={bookingMode === "day" ? "Per Day Rental" : "Per KM Rental"}
        />
        {bookingMode === "day" ? (
          <>
            <InfoRow
              label="Rate"
              value={`${formatCurrency(vehicle.pricePerDay, locale)} / day`}
            />
            <InfoRow label="Duration" value={`${days} day${days === 1 ? "" : "s"}`} />
          </>
        ) : (
          <>
            <InfoRow label="Rate" value={`${formatCurrency(pricePerKm, locale)} / km`} />
            <InfoRow
              label="Minimum billing"
              value={`${VEHICLE_MIN_KM_ROUND_TRIP} km (round trip)`}
            />
            {billableKm > 0 && (
              <InfoRow label="Billable distance" value={`${billableKm} km`} />
            )}
          </>
        )}
        <InfoRow
          label="Estimated total"
          value={formatCurrency(estimatedTotal, locale)}
          className="text-primary"
        />

        <div className="border-t border-border/60 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {bookingMode === "day" ? "Per-day inclusions" : "Per-km inclusions"}
          </p>
          <ul className="space-y-1.5">
            {inclusions.map((line) => (
              <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
