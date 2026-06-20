import { getBookings } from "@/lib/data-service";
import { getAdminHotels, hydrateHotelsStore } from "@/lib/hotel-store";
import { getPublishedPackages, hydratePackagesStore } from "@/lib/package-store";
import { getAdminVehicles, hydrateVehiclesStore } from "@/lib/vehicle-store";
import type { PriceRule, PricingEntityType, PricingHistoryRecord } from "@/lib/ai-center/types";

const PEAK_MONTHS = [4, 5, 10, 11, 12]; // May, Jun, Nov, Dec, Jan (0-indexed: Dec=11)
const FESTIVAL_MONTHS = [9, 10, 11]; // Oct-Dec

function isPeakSeason(date = new Date()): boolean {
  return PEAK_MONTHS.includes(date.getMonth());
}

function isFestivalSeason(date = new Date()): boolean {
  return FESTIVAL_MONTHS.includes(date.getMonth());
}

function isWeekend(date = new Date()): boolean {
  const d = date.getDay();
  return d === 0 || d === 5 || d === 6;
}

function demandMultiplier(bookings30d: number, peak: boolean, weekend: boolean, festival: boolean): number {
  let m = 1;
  if (bookings30d > 20) m += 0.15;
  else if (bookings30d > 10) m += 0.08;
  else if (bookings30d < 3) m -= 0.12;
  if (peak) m += 0.12;
  if (weekend) m += 0.05;
  if (festival) m += 0.08;
  return m;
}

function clampPrice(price: number, oldPrice: number, rule?: PriceRule): number {
  const minPct = rule?.minPricePercent ?? 75;
  const maxPct = rule?.maxPricePercent ?? 135;
  let min = Math.round(oldPrice * (minPct / 100));
  let max = Math.round(oldPrice * (maxPct / 100));
  if (rule?.minAbsolute) min = Math.max(min, rule.minAbsolute);
  if (rule?.maxAbsolute) max = Math.min(max, rule.maxAbsolute);
  return Math.min(max, Math.max(min, price));
}

export async function generateDynamicPricingSuggestions(
  rules: PriceRule[]
): Promise<Omit<PricingHistoryRecord, "id" | "createdAt" | "status">[]> {
  await Promise.all([
    hydratePackagesStore(),
    hydrateHotelsStore(),
    hydrateVehiclesStore(),
  ]);

  const bookings = await getBookings();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentBookings = bookings.filter((b) => new Date(b.createdAt) >= thirtyDaysAgo);
  const peak = isPeakSeason(now);
  const weekend = isWeekend(now);
  const festival = isFestivalSeason(now);
  const season = peak ? "Peak Season" : "Off Season";

  const suggestions: Omit<PricingHistoryRecord, "id" | "createdAt" | "status">[] = [];

  const packageRule = rules.find((r) => r.entityType === "package" && r.enabled);
  for (const pkg of getPublishedPackages().slice(0, 12)) {
    const dest = pkg.cities[0] ?? "India";
    const destBookings = recentBookings.filter((b) =>
      JSON.stringify(b.serviceName).toLowerCase().includes(dest.toLowerCase())
    ).length;
    const mult = demandMultiplier(destBookings, peak, weekend, festival);
    const raw = Math.round(pkg.price * mult);
    const suggested = clampPrice(raw, pkg.price, packageRule);

    if (suggested === pkg.price) continue;

    suggestions.push({
      entityType: "package",
      entityId: pkg.id,
      entityName: pkg.title.en,
      destination: dest,
      oldPrice: pkg.price,
      suggestedPrice: suggested,
      changePercent: Math.round(((suggested - pkg.price) / pkg.price) * 100),
      reason:
        mult > 1
          ? `${dest} demand high (${season}${festival ? ", festival period" : ""})`
          : `Off-season demand lower for ${dest}`,
      factors: {
        season,
        demandLevel: destBookings > 10 ? "high" : destBookings > 4 ? "medium" : "low",
        isWeekend: weekend,
        isPeakSeason: peak,
        isFestival: festival,
        bookingCount30d: destBookings,
      },
    });
  }

  const hotelRule = rules.find((r) => r.entityType === "hotel" && r.enabled);
  for (const hotel of getAdminHotels().filter((h) => h.available).slice(0, 10)) {
    const occupancy = hotel.rooms.filter((r) => r.available).length / Math.max(hotel.rooms.length, 1);
    const mult = occupancy < 0.5 ? 0.88 : occupancy > 0.8 ? 1.15 : 1;
    const raw = Math.round(hotel.priceFrom * mult);
    const suggested = clampPrice(raw, hotel.priceFrom, hotelRule);
    if (suggested === hotel.priceFrom) continue;

    suggestions.push({
      entityType: "hotel",
      entityId: hotel.id,
      entityName: hotel.name.en,
      destination: hotel.city,
      oldPrice: hotel.priceFrom,
      suggestedPrice: suggested,
      changePercent: Math.round(((suggested - hotel.priceFrom) / hotel.priceFrom) * 100),
      reason:
        mult > 1
          ? `High occupancy in ${hotel.city}`
          : `Low occupancy — promotional pricing for ${hotel.city}`,
      factors: {
        season,
        demandLevel: occupancy > 0.8 ? "high" : occupancy < 0.5 ? "low" : "medium",
        isWeekend: weekend,
        isPeakSeason: peak,
        isFestival: festival,
        bookingCount30d: recentBookings.filter((b) => b.serviceType === "hotel").length,
      },
    });
  }

  const vehicleRule = rules.find((r) => r.entityType === "vehicle" && r.enabled);
  for (const vehicle of getAdminVehicles().filter((v) => v.available).slice(0, 10)) {
    const vehicleBookings = recentBookings.filter((b) => b.serviceType === "vehicle").length;
    const mult = demandMultiplier(vehicleBookings, peak, weekend, festival);
    const raw = Math.round(vehicle.pricePerDay * mult);
    const suggested = clampPrice(raw, vehicle.pricePerDay, vehicleRule);
    if (suggested === vehicle.pricePerDay) continue;

    suggestions.push({
      entityType: "vehicle",
      entityId: vehicle.id,
      entityName: vehicle.name.en,
      destination: vehicle.location,
      oldPrice: vehicle.pricePerDay,
      suggestedPrice: suggested,
      changePercent: Math.round(((suggested - vehicle.pricePerDay) / vehicle.pricePerDay) * 100),
      reason:
        mult > 1
          ? `${vehicle.name.en} demand rising`
          : `Lower demand — discount on ${vehicle.name.en}`,
      factors: {
        season,
        demandLevel: vehicleBookings > 8 ? "high" : vehicleBookings > 3 ? "medium" : "low",
        isWeekend: weekend,
        isPeakSeason: peak,
        isFestival: festival,
        bookingCount30d: vehicleBookings,
      },
    });
  }

  return suggestions;
}

export function defaultPriceRules(): PriceRule[] {
  const types: PricingEntityType[] = ["package", "hotel", "vehicle", "activity"];
  return types.map((entityType) => ({
    id: `rule_${entityType}`,
    entityType,
    minPricePercent: 75,
    maxPricePercent: 135,
    manualOverrideEnabled: true,
    enabled: true,
    updatedAt: new Date().toISOString(),
  }));
}
