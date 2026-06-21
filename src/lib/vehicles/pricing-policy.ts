import { formatCurrency } from "@/lib/i18n";
import type { Vehicle } from "@/types";
import { getEffectivePricePerKm } from "@/lib/vehicles/capacity";

/** Minimum billable km for per-km booking (round trip total: go + return). */
export const VEHICLE_MIN_KM_ROUND_TRIP = 100;

/** Included km per day before extra km charges apply. */
export const VEHICLE_INCLUDED_KM_PER_DAY = 150;

export type VehiclePricingMode = "day" | "km";

export function calculateBillableKmFromOneWay(oneWayKm: number): number {
  const roundTrip = Math.max(0, oneWayKm) * 2;
  return Math.max(roundTrip, VEHICLE_MIN_KM_ROUND_TRIP);
}

export function getVehicleDayInclusions(
  locale: "en" | "hi",
  vehicle: Vehicle,
  pricePerKm: number
): string[] {
  if (locale === "hi") {
    return [
      vehicle.driverIncluded ? "ड्राइवर शामिल" : "ड्राइवर उपलब्ध",
      "नाइट चार्ज शामिल",
      `प्रति दिन अधिकतम ${VEHICLE_INCLUDED_KM_PER_DAY} किमी शामिल`,
      `अतिरिक्त किमी पर ${formatCurrency(pricePerKm, locale)}/किमी अतिरिक्त शुल्क`,
      "ईंधन और टोल अलग (यदि लागू हो)",
    ];
  }
  return [
    vehicle.driverIncluded ? "Driver included" : "Driver available",
    "Night charge included",
    `Up to ${VEHICLE_INCLUDED_KM_PER_DAY} km per day included`,
    `Extra km charged at ${formatCurrency(pricePerKm, locale)}/km`,
    "Fuel & tolls extra (if applicable)",
  ];
}

export function getVehicleKmInclusions(
  locale: "en" | "hi",
  vehicle: Vehicle,
  pricePerKm: number
): string[] {
  if (locale === "hi") {
    return [
      vehicle.driverIncluded ? "ड्राइवर शामिल" : "ड्राइवर उपलब्ध",
      `न्यूनतम ${VEHICLE_MIN_KM_ROUND_TRIP} किमी बिलिंग (आना + जाना दोनों)`,
      "एक तरफ़ की दूरी × 2 = कुल किमी",
      `दर: ${formatCurrency(pricePerKm, locale)}/किमी`,
      `उदाहरण: 40 किमी एक तरफ़ = 80 किमी, न्यूनतम ${VEHICLE_MIN_KM_ROUND_TRIP} किमी बिल`,
    ];
  }
  return [
    vehicle.driverIncluded ? "Driver included" : "Driver available",
    `Minimum ${VEHICLE_MIN_KM_ROUND_TRIP} km billed (round trip: go + return)`,
    "One-way distance × 2 = total km",
    `Rate: ${formatCurrency(pricePerKm, locale)}/km`,
    `Example: 40 km one-way = 80 km → minimum ${VEHICLE_MIN_KM_ROUND_TRIP} km billed`,
  ];
}

export function getVehiclePricingSummary(
  vehicle: Vehicle,
  locale: "en" | "hi"
): { pricePerDay: number; pricePerKm: number } {
  return {
    pricePerDay: vehicle.pricePerDay,
    pricePerKm: getEffectivePricePerKm(vehicle),
  };
}
