/** Approximate road distance (km) between major Indian cities — used for fare math only */
const CITY_COORDS: Record<string, string> = {
  delhi: "delhi",
  "new delhi": "delhi",
  lucknow: "lucknow",
  mumbai: "mumbai",
  bangalore: "bangalore",
  bengaluru: "bangalore",
  jaipur: "jaipur",
  kolkata: "kolkata",
  hyderabad: "hyderabad",
  manali: "manali",
  shimla: "shimla",
  kashmir: "kashmir",
  srinagar: "kashmir",
  goa: "goa",
  kerala: "kerala",
  kochi: "kerala",
  darjeeling: "darjeeling",
  udaipur: "udaipur",
  rishikesh: "rishikesh",
};

const DISTANCE_KM: Record<string, Record<string, number>> = {
  delhi: { manali: 540, shimla: 350, kashmir: 850, goa: 1900, kerala: 2600, darjeeling: 1500, jaipur: 280, rishikesh: 240, udaipur: 660 },
  lucknow: { manali: 900, shimla: 780, kashmir: 1100, goa: 1800, kerala: 2400, darjeeling: 900, jaipur: 600, udaipur: 900 },
  mumbai: { goa: 590, kerala: 1300, udaipur: 760, manali: 1900, shimla: 1750, kashmir: 2200, darjeeling: 2300, jaipur: 1170 },
  bangalore: { kerala: 560, goa: 560, manali: 2700, shimla: 2500, udaipur: 1650, darjeeling: 2400, jaipur: 2100 },
  jaipur: { udaipur: 390, manali: 800, shimla: 650, goa: 1600, kerala: 2300, darjeeling: 1500 },
  kolkata: { darjeeling: 620, goa: 2100, kerala: 2300, manali: 1900, shimla: 1800, jaipur: 1500 },
  hyderabad: { goa: 640, kerala: 900, manali: 2200, udaipur: 1200, darjeeling: 1800 },
};

function normalizeCity(city: string): string {
  const key = city.trim().toLowerCase();
  return CITY_COORDS[key] ?? key;
}

export function estimateDistanceKm(fromCity: string, toCity: string): number {
  const from = normalizeCity(fromCity);
  const to = normalizeCity(toCity);
  if (from === to) return 50;
  const direct = DISTANCE_KM[from]?.[to] ?? DISTANCE_KM[to]?.[from];
  if (direct) return direct;
  return 800;
}

export function estimateTravelHours(km: number): number {
  return Math.round((km / 55) * 10) / 10;
}

export interface HiddenTravelCosts {
  distanceKm: number;
  travelHours: number;
  fuelCost: number;
  vehicleFare: number;
  toll: number;
  stateTax: number;
  hotelTotal: number;
  activitiesTotal: number;
  mealsTotal: number;
  grandTotal: number;
}

export function calculateHiddenCosts(input: {
  fromCity: string;
  toCity: string;
  durationDays: number;
  guests: number;
  vehiclePricePerDay: number;
  vehiclePricePerKm?: number;
  hotelTotal: number;
  activitiesTotal: number;
  mealsPerDayPerPerson?: number;
  tierMultiplier?: number;
}): HiddenTravelCosts {
  const distanceKm = estimateDistanceKm(input.fromCity, input.toCity);
  const travelHours = estimateTravelHours(distanceKm);
  const roundTripKm = distanceKm * 2;
  const fuelCost = Math.round(roundTripKm * 8);
  const perKm = input.vehiclePricePerKm ?? 12;
  const vehicleFare =
    input.vehiclePricePerDay * input.durationDays +
    Math.round(roundTripKm * perKm);
  const toll = Math.round(roundTripKm * 1.2);
  const stateTax = Math.round((vehicleFare + toll) * 0.06);
  const mealsTotal = Math.round(
    (input.mealsPerDayPerPerson ?? 400) * input.durationDays * input.guests
  );
  const subtotal =
    vehicleFare +
    fuelCost +
    toll +
    stateTax +
    input.hotelTotal +
    input.activitiesTotal +
    mealsTotal;
  const grandTotal = Math.round(subtotal * (input.tierMultiplier ?? 1));

  return {
    distanceKm,
    travelHours,
    fuelCost,
    vehicleFare,
    toll,
    stateTax,
    hotelTotal: input.hotelTotal,
    activitiesTotal: input.activitiesTotal,
    mealsTotal,
    grandTotal,
  };
}
