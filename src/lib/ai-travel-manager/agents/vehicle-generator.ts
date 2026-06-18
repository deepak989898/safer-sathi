import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { saveVehicleDraft, saveGeneratedImage } from "@/lib/ai-travel-manager/repository";
import type { AIVehicleDraft } from "@/lib/ai-travel-manager/types";
import type { VehicleType } from "@/types";

export interface GenerateVehicleInput {
  name?: string;
  category?: VehicleType;
  seats?: number;
  location?: string;
  createdBy: string;
}

const VEHICLE_PRESETS: Record<
  string,
  { type: VehicleType; seats: number; pricePerDay: number; pricePerKm: number; fuel: string }
> = {
  innova: { type: "suv", seats: 7, pricePerDay: 3500, pricePerKm: 14, fuel: "Diesel" },
  ertiga: { type: "suv", seats: 6, pricePerDay: 2500, pricePerKm: 12, fuel: "Petrol" },
  mercedes: { type: "luxury", seats: 4, pricePerDay: 8000, pricePerKm: 25, fuel: "Petrol" },
  tempo: { type: "tempo_traveller", seats: 17, pricePerDay: 5500, pricePerKm: 18, fuel: "Diesel" },
  bus: { type: "bus", seats: 45, pricePerDay: 15000, pricePerKm: 35, fuel: "Diesel" },
  city: { type: "car", seats: 4, pricePerDay: 2000, pricePerKm: 10, fuel: "Petrol" },
};

function matchPreset(name: string): keyof typeof VEHICLE_PRESETS {
  const n = name.toLowerCase();
  if (n.includes("innova")) return "innova";
  if (n.includes("ertiga")) return "ertiga";
  if (n.includes("mercedes") || n.includes("luxury")) return "mercedes";
  if (n.includes("tempo")) return "tempo";
  if (n.includes("bus")) return "bus";
  return "city";
}

export async function generateVehicleDraft(
  input: GenerateVehicleInput
): Promise<AIVehicleDraft> {
  const name = input.name?.trim() || "Toyota Innova Crysta";
  const preset = VEHICLE_PRESETS[matchPreset(name)];
  const now = new Date().toISOString();

  const banner = await saveGeneratedImage({
    id: `img_v_${Date.now()}`,
    type: "vehicle_banner",
    url: TRAVEL_IMAGES.suv.replace("w=800", "w=1920"),
    relatedId: `veh_${Date.now()}`,
    prompt: `Vehicle banner for ${name}`,
    createdAt: now,
  });

  const draft: AIVehicleDraft = {
    id: `ai_veh_${Date.now()}`,
    name: { en: name, hi: name },
    type: input.category ?? preset.type,
    category: input.category ?? preset.type,
    seats: input.seats ?? preset.seats,
    pricePerDay: preset.pricePerDay,
    pricePerKm: preset.pricePerKm,
    images: [banner.url, TRAVEL_IMAGES.sedan],
    available: true,
    fuelType: preset.fuel,
    driverIncluded: true,
    description: {
      en: `Premium ${name} for outstation and city travel across India.`,
      hi: `${name} — आरामदायक यात्रा के लिए।`,
    },
    features: ["AC", "GPS", "Push-back seats", "Music system"],
    rating: 4.5,
    reviewCount: 0,
    location: input.location ?? "Delhi NCR",
    approvalStatus: "draft",
    generatedImages: [banner],
    proposedBy: "ai_travel_manager",
    createdAt: now,
    updatedAt: now,
  };

  banner.relatedId = draft.id;
  return saveVehicleDraft(draft);
}
