import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { addVehicleDraft, reloadVehiclesStore } from "@/lib/vehicle-store";
import { routeCompletion } from "@/lib/ai/router";
import type { Vehicle, VehicleType } from "@/types";

export interface MarketVehicleInput {
  name?: string;
  type?: VehicleType;
  location?: string;
  locale?: "en" | "hi";
}

const TYPE_BENCHMARKS: Record<
  VehicleType,
  { pricePerDay: number; pricePerKm: number; seats: number; fuel: string }
> = {
  car: { pricePerDay: 2200, pricePerKm: 11, seats: 4, fuel: "Petrol" },
  suv: { pricePerDay: 3200, pricePerKm: 14, seats: 7, fuel: "Diesel" },
  luxury: { pricePerDay: 7500, pricePerKm: 24, seats: 4, fuel: "Petrol" },
  tempo_traveller: { pricePerDay: 5200, pricePerKm: 17, seats: 12, fuel: "Diesel" },
  mini_bus: { pricePerDay: 9000, pricePerKm: 28, seats: 20, fuel: "Diesel" },
  bus: { pricePerDay: 14000, pricePerKm: 32, seats: 40, fuel: "Diesel" },
};

function inferType(name: string, type?: VehicleType): VehicleType {
  if (type) return type;
  const n = name.toLowerCase();
  if (n.includes("tempo") || n.includes("traveller")) return "tempo_traveller";
  if (n.includes("bus")) return "bus";
  if (n.includes("mercedes") || n.includes("bmw") || n.includes("audi")) return "luxury";
  if (n.includes("innova") || n.includes("ertiga") || n.includes("suv")) return "suv";
  return "car";
}

function ruleBasedMarketVehicle(input: MarketVehicleInput): Vehicle {
  const name = input.name?.trim() || "Toyota Innova Crysta";
  const type = inferType(name, input.type);
  const benchmark = TYPE_BENCHMARKS[type];
  const location = input.location?.trim() || "Delhi NCR";
  const now = new Date().toISOString();

  return {
    id: `veh_ai_${Date.now()}`,
    slug: undefined,
    name: { en: name, hi: name },
    brand: name.split(" ")[0],
    category: type.replace(/_/g, " "),
    type,
    seats: benchmark.seats,
    pricePerDay: benchmark.pricePerDay,
    pricePerKm: benchmark.pricePerKm,
    images: [TRAVEL_IMAGES.suv, TRAVEL_IMAGES.sedan],
    available: false,
    status: "inactive",
    fuelType: benchmark.fuel,
    driverIncluded: true,
    description: {
      en: `AI-priced ${name} for outstation and city travel. ₹${benchmark.pricePerDay.toLocaleString("en-IN")}/day or ₹${benchmark.pricePerKm}/km with driver.`,
      hi: `${name} — बाजार भाव पर उपलब्ध।`,
    },
    features: ["AC", "GPS", "Push-back seats", "Music system"],
    rating: 4.5,
    reviewCount: 0,
    location,
    publishStatus: "pending_approval",
    marketAnalysis: {
      en: `Market rate for ${type.replace(/_/g, " ")} vehicles in ${location}: ₹${benchmark.pricePerDay.toLocaleString("en-IN")}/day typical.`,
      hi: `${location} में ${type} वाहन की प्रतिस्पर्धी दर।`,
    },
    proposedBy: "ai_market_agent",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runMarketVehicleAgent(
  input: MarketVehicleInput
): Promise<{ vehicle: Vehicle; provider: string }> {
  await reloadVehiclesStore();
  const name = input.name?.trim() || "Toyota Innova Crysta";
  const type = inferType(name, input.type);
  const location = input.location?.trim() || "Delhi NCR";

  const { content, provider } = await routeCompletion(
    `You are Safar Sathi vehicle rental analyst for India. Summarize competitive pricing in 2 sentences.`,
    [
      {
        role: "user",
        content: `Vehicle: ${name}, Type: ${type}, Location: ${location}.`,
      },
    ],
    async () =>
      `Market scan: ${name} rental rates in ${location} align with current demand for ${type} category vehicles.`
  );

  const draft = ruleBasedMarketVehicle(input);
  draft.marketAnalysis = { en: content, hi: content };
  const saved = await addVehicleDraft(draft);
  return { vehicle: saved, provider };
}
