import { getHotels, getVehicles } from "@/lib/data-service";
import {
  getActivitiesByDestination,
  hydrateActivitiesStore,
} from "@/lib/activity-store";
import { calculateHiddenCosts } from "@/lib/ai/travel-manager/travel-costs";
import { buildDayItinerary, type ItineraryDay } from "@/lib/ai/travel-manager/itinerary-builder";
import { localizedText } from "@/lib/i18n";
import type { CustomPackageQuote } from "@/types/travel-manager";
import type { Hotel, HotelRoom, Locale, Vehicle } from "@/types";

export type PackageTierId = "budget" | "standard" | "premium" | "luxury";

export interface TierPackageQuote extends CustomPackageQuote {
  tierId: PackageTierId;
  tierLabel: string;
  nights: number;
  includedPlaces: string[];
  mealsLabel: string;
  itinerary: ItineraryDay[];
}

export interface BuildTierPackagesInput {
  destination: string;
  pickupCity: string;
  tripType?: string;
  activityNames: string[];
  guests: number;
  budget?: number;
  baseDurationDays?: number;
  locale: Locale;
}

const TIER_CONFIG: Record<
  PackageTierId,
  {
    label: string;
    labelHi: string;
    extraDays: number;
    minStars: number;
    maxStars: number;
    meals: string;
    mealsHi: string;
    multiplier: number;
    activityCount: number;
  }
> = {
  budget: {
    label: "Budget Package",
    labelHi: "बजट पैकेज",
    extraDays: 0,
    minStars: 2,
    maxStars: 3,
    meals: "Breakfast Included",
    mealsHi: "नाश्ता शामिल",
    multiplier: 1,
    activityCount: 2,
  },
  standard: {
    label: "Standard Package",
    labelHi: "स्टैंडर्ड पैकेज",
    extraDays: 1,
    minStars: 3,
    maxStars: 4,
    meals: "Meals Included",
    mealsHi: "भोजन शामिल",
    multiplier: 1.08,
    activityCount: 4,
  },
  premium: {
    label: "Premium Package",
    labelHi: "प्रीमियम पैकेज",
    extraDays: 2,
    minStars: 4,
    maxStars: 5,
    meals: "All Meals Included",
    mealsHi: "सभी भोजन शामिल",
    multiplier: 1.15,
    activityCount: 5,
  },
  luxury: {
    label: "Luxury Package",
    labelHi: "लक्ज़री पैकेज",
    extraDays: 3,
    minStars: 5,
    maxStars: 5,
    meals: "Luxury Dining & Bonfire",
    mealsHi: "लक्ज़री डाइनिंग और बोनफायर",
    multiplier: 1.25,
    activityCount: 6,
  },
};

function filterHotelsByDest(all: Hotel[], dest: string): Hotel[] {
  const d = dest.toLowerCase();
  const matched = all.filter(
    (h) =>
      h.available &&
      (h.city.toLowerCase().includes(d) ||
        h.location.toLowerCase().includes(d) ||
        h.state?.toLowerCase().includes(d) ||
        d.includes(h.city.toLowerCase()))
  );
  return matched.length > 0 ? matched : all.filter((h) => h.available);
}

function pickHotelForTier(
  hotels: Hotel[],
  tier: PackageTierId,
  guests: number
): { hotel: Hotel; room: HotelRoom } | null {
  const cfg = TIER_CONFIG[tier];
  const sorted = [...hotels]
    .filter((h) => h.starRating >= cfg.minStars && h.starRating <= cfg.maxStars + 1)
    .sort((a, b) => {
      if (tier === "budget") return a.priceFrom - b.priceFrom;
      if (tier === "luxury") return b.priceFrom - a.priceFrom || b.starRating - a.starRating;
      return b.starRating - a.starRating || a.priceFrom - b.priceFrom;
    });

  for (const hotel of sorted.length ? sorted : hotels) {
    const room =
      hotel.rooms.find((r) => r.available && r.maxGuests >= Math.min(guests, 2)) ??
      hotel.rooms.find((r) => r.available);
    if (room) return { hotel, room };
  }
  return null;
}

function pickVehicleForTier(
  vehicles: Vehicle[],
  tier: PackageTierId,
  guests: number
): Vehicle | null {
  const available = vehicles.filter((v) => v.available && v.seats >= guests);
  const pool = available.length ? available : vehicles.filter((v) => v.available);
  if (!pool.length) return null;

  const sorted = [...pool].sort((a, b) => a.pricePerDay - b.pricePerDay);
  switch (tier) {
    case "budget":
      return sorted[0];
    case "standard":
      return sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
    case "premium":
      return sorted[Math.max(0, sorted.length - 2)] ?? sorted[sorted.length - 1];
    case "luxury":
      return sorted[sorted.length - 1];
    default:
      return sorted[0];
  }
}

function defaultPlaces(destination: string): string[] {
  const d = destination.toLowerCase();
  if (d.includes("manali")) return ["Solang Valley", "Hadimba Temple", "Local Market", "Rohtang Pass"];
  if (d.includes("shimla")) return ["Mall Road", "Kufri", "Jakhoo Temple"];
  if (d.includes("goa")) return ["North Goa Beaches", "Fort Aguada", "Water Sports"];
  if (d.includes("kerala")) return ["Munnar", "Alleppey Backwaters", "Tea Gardens"];
  if (d.includes("kashmir")) return ["Dal Lake", "Gulmarg", "Pahalgam"];
  if (d.includes("darjeeling")) return ["Tiger Hill", "Batasia Loop", "Tea Estate"];
  if (d.includes("jaipur")) return ["Amer Fort", "Hawa Mahal", "City Palace"];
  return ["Local Sightseeing", "Popular Attractions", "City Tour"];
}

async function buildSingleTier(
  tierId: PackageTierId,
  input: BuildTierPackagesInput,
  allHotels: Hotel[],
  allVehicles: Vehicle[]
): Promise<TierPackageQuote> {
  const cfg = TIER_CONFIG[tierId];
  const durationDays = Math.max(3, (input.baseDurationDays ?? 4) + cfg.extraDays);
  const nights = Math.max(1, durationDays - 1);
  const destHotels = filterHotelsByDest(allHotels, input.destination);
  const picked = pickHotelForTier(destHotels, tierId, input.guests);
  const vehicle = pickVehicleForTier(allVehicles, tierId, input.guests);

  const roomsNeeded = Math.max(1, Math.ceil(input.guests / (picked?.room.maxGuests ?? 2)));
  const hotelTotal = picked ? picked.room.pricePerNight * nights * roomsNeeded : 0;

  await hydrateActivitiesStore();
  const destActs = getActivitiesByDestination(input.destination);
  let activityPool = input.activityNames.length
    ? destActs.filter((a) =>
        input.activityNames.some(
          (n) =>
            a.name.en.toLowerCase().includes(n.toLowerCase()) ||
            n.toLowerCase().includes(a.name.en.toLowerCase())
        )
      )
    : destActs;
  if (activityPool.length === 0) activityPool = destActs;
  const selectedActs = activityPool.slice(0, cfg.activityCount);
  const activityItems = selectedActs.map((a) => ({
    id: a.id,
    name: localizedText(a.name, input.locale),
    price: a.price * input.guests,
  }));
  const activitiesTotal = activityItems.reduce((s, a) => s + a.price, 0);

  const costs = calculateHiddenCosts({
    fromCity: input.pickupCity,
    toCity: input.destination,
    durationDays,
    guests: input.guests,
    vehiclePricePerDay: vehicle?.pricePerDay ?? 3500,
    vehiclePricePerKm: vehicle?.pricePerKm,
    hotelTotal,
    activitiesTotal,
    tierMultiplier: cfg.multiplier,
    mealsPerDayPerPerson: tierId === "luxury" ? 800 : tierId === "budget" ? 250 : 450,
  });

  const places = defaultPlaces(input.destination).slice(0, cfg.activityCount + 2);
  const tierLabel = input.locale === "hi" ? cfg.labelHi : cfg.label;
  const mealsLabel = input.locale === "hi" ? cfg.mealsHi : cfg.meals;
  const hotelName = picked ? localizedText(picked.hotel.name, input.locale) : undefined;
  const itinerary = buildDayItinerary({
    destination: input.destination,
    pickupCity: input.pickupCity,
    durationDays,
    places,
    activityNames: activityItems.map((a) => a.name),
    hotelName,
    mealsLabel,
    locale: input.locale,
  });

  return {
    tierId,
    tierLabel,
    nights,
    includedPlaces: places,
    mealsLabel,
    itinerary,
    title: `${input.destination} ${tierLabel}`,
    destination: input.destination,
    durationDays,
    guests: input.guests,
    hotel: picked
      ? {
          id: picked.hotel.id,
          name: localizedText(picked.hotel.name, input.locale),
          starRating: picked.hotel.starRating,
          roomType: localizedText(picked.room.name, input.locale),
          pricePerNight: picked.room.pricePerNight,
          total: hotelTotal,
          image: picked.hotel.images[0],
        }
      : undefined,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          name: localizedText(vehicle.name, input.locale),
          pricePerDay: vehicle.pricePerDay,
          pricePerKm: vehicle.pricePerKm,
          total: costs.vehicleFare,
          image: vehicle.images[0],
        }
      : undefined,
    activities: activityItems,
    meals: [mealsLabel],
    pickup: input.pickupCity,
    lineItems: [],
    totalAmount: costs.grandTotal,
    serviceId: `ai_tier_${tierId}_${Date.now()}`,
    notes: JSON.stringify({
      tierId,
      destination: input.destination,
      pickupCity: input.pickupCity,
      tripType: input.tripType,
      activities: input.activityNames,
      hotelId: picked?.hotel.id,
      vehicleId: vehicle?.id,
      livePricing: true,
    }),
  };
}

export async function buildTierPackages(
  input: BuildTierPackagesInput
): Promise<TierPackageQuote[]> {
  await hydrateActivitiesStore();
  const [allHotels, allVehicles] = await Promise.all([getHotels(), getVehicles()]);
  const tiers: PackageTierId[] = ["budget", "standard", "premium", "luxury"];
  return Promise.all(
    tiers.map((tierId) => buildSingleTier(tierId, input, allHotels, allVehicles))
  );
}

export async function recalculateSelectedTier(
  quote: TierPackageQuote,
  input: BuildTierPackagesInput,
  mods: { removeHotel?: boolean; removeVehicle?: boolean; extraNights?: number }
): Promise<TierPackageQuote> {
  const [allHotels, allVehicles] = await Promise.all([getHotels(), getVehicles()]);
  const updated = await buildSingleTier(
    quote.tierId,
    {
      ...input,
      baseDurationDays: (input.baseDurationDays ?? quote.durationDays) + (mods.extraNights ?? 0),
    },
    allHotels,
    allVehicles
  );
  if (mods.removeHotel) {
    updated.hotel = undefined;
    updated.totalAmount = Math.round(updated.totalAmount * 0.55);
  }
  if (mods.removeVehicle) {
    updated.vehicle = undefined;
    updated.totalAmount = Math.round(updated.totalAmount * 0.65);
  }
  return updated;
}
