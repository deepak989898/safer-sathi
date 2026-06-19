import type { Activity } from "@/types";

const now = new Date().toISOString();

function act(
  id: string,
  nameEn: string,
  destination: string,
  category: string,
  price: number,
  tags: string[] = []
): Activity {
  return {
    id,
    name: { en: nameEn, hi: nameEn },
    destination,
    category,
    price,
    durationHours: 2,
    available: true,
    tags,
    createdAt: now,
    updatedAt: now,
  };
}

const ACTIVITY_SEED: Activity[] = [
  // Manali
  act("act-manali-paragliding", "Paragliding", "Manali", "adventure", 3500, ["adventure"]),
  act("act-manali-rafting", "River Rafting", "Manali", "adventure", 2800, ["adventure"]),
  act("act-manali-camping", "Camping", "Manali", "adventure", 4500, ["adventure"]),
  act("act-manali-trekking", "Trekking", "Manali", "adventure", 3200, ["adventure"]),
  act("act-manali-skiing", "Skiing", "Manali", "adventure", 5000, ["adventure"]),
  act("act-manali-biking", "Mountain Biking", "Manali", "adventure", 2200, ["adventure"]),
  act("act-manali-jeep", "Jeep Safari", "Manali", "adventure", 3800, ["adventure"]),
  act("act-manali-rohtang", "Rohtang Pass Trip", "Manali", "adventure", 4200, ["adventure"]),
  // Goa
  act("act-goa-watersports", "Water Sports", "Goa", "adventure", 2500, ["beach", "adventure"]),
  act("act-goa-cruise", "Sunset Cruise", "Goa", "leisure", 1800, ["beach", "romantic"]),
  act("act-goa-scuba", "Scuba Diving", "Goa", "adventure", 4500, ["beach", "adventure"]),
  // Kerala
  act("act-kerala-houseboat", "Houseboat Stay", "Kerala", "leisure", 8500, ["family"]),
  act("act-kerala-ayurveda", "Ayurveda Spa", "Kerala", "wellness", 3500, ["yoga", "luxury"]),
  // Kashmir
  act("act-kashmir-shikara", "Shikara Ride", "Kashmir", "leisure", 1500, ["romantic"]),
  act("act-kashmir-gondola", "Gondola Ride", "Kashmir", "adventure", 2200, ["adventure"]),
  // Golden Triangle
  act("act-delhi-heritage", "Heritage Walk Delhi", "Delhi", "cultural", 1200, ["pilgrimage"]),
  act("act-agra-taj", "Taj Mahal Guided Tour", "Agra", "cultural", 1800, ["pilgrimage"]),
  act("act-jaipur-fort", "Amer Fort Tour", "Jaipur", "cultural", 2000, ["family"]),
];

export function getActivitiesSeed(): Activity[] {
  return ACTIVITY_SEED;
}

export const ACTIVITIES_SEED_COUNT = ACTIVITY_SEED.length;
