import type { BlogImagePrompt } from "@/lib/ai-center/types";
import { HERO_IMAGES, TRAVEL_IMAGES } from "@/lib/media/travel-images";

function hero(url: string): string {
  if (url.includes("w=1920")) return url;
  return url.replace("w=800", "w=1920");
}

interface DestinationImageSet {
  hero: string;
  places: string;
  activities: string;
  hotels: string;
  banner: string;
}

/** Curated Unsplash images matched to Indian travel destinations. */
const DESTINATION_IMAGES: Record<string, DestinationImageSet> = {
  manali: {
    hero: hero(TRAVEL_IMAGES.himalayaMountains),
    places: hero(TRAVEL_IMAGES.shimlaHills),
    activities: hero(TRAVEL_IMAGES.manaliAdventure),
    hotels: hero(TRAVEL_IMAGES.mountainResort),
    banner: hero(TRAVEL_IMAGES.himalayaMountains),
  },
  jaipur: {
    hero: hero(TRAVEL_IMAGES.jaipurFort),
    places: hero(TRAVEL_IMAGES.rajasthanPalace),
    activities: hero(TRAVEL_IMAGES.goldenTriangle),
    hotels: hero(TRAVEL_IMAGES.hotelLuxury),
    banner: hero(TRAVEL_IMAGES.jaipurFort),
  },
  goa: {
    hero: hero(TRAVEL_IMAGES.beachResort),
    places: hero(TRAVEL_IMAGES.keralaBackwaters),
    activities: hero(TRAVEL_IMAGES.beachResort),
    hotels: hero(TRAVEL_IMAGES.hotelLuxury),
    banner: hero(TRAVEL_IMAGES.beachResort),
  },
  kashmir: {
    hero: hero(TRAVEL_IMAGES.kashmirLake),
    places: hero(TRAVEL_IMAGES.kashmirLake),
    activities: hero(TRAVEL_IMAGES.himalayaMountains),
    hotels: hero(TRAVEL_IMAGES.mountainResort),
    banner: hero(TRAVEL_IMAGES.kashmirLake),
  },
  kerala: {
    hero: hero(TRAVEL_IMAGES.keralaBackwaters),
    places: hero(TRAVEL_IMAGES.keralaBackwaters),
    activities: hero(TRAVEL_IMAGES.beachResort),
    hotels: hero(TRAVEL_IMAGES.hotelLake),
    banner: hero(TRAVEL_IMAGES.keralaBackwaters),
  },
  shimla: {
    hero: hero(TRAVEL_IMAGES.shimlaHills),
    places: hero(TRAVEL_IMAGES.himalayaMountains),
    activities: hero(TRAVEL_IMAGES.manaliAdventure),
    hotels: hero(TRAVEL_IMAGES.mountainResort),
    banner: hero(TRAVEL_IMAGES.shimlaHills),
  },
  rishikesh: {
    hero: hero(TRAVEL_IMAGES.rishikeshRiver),
    places: hero(TRAVEL_IMAGES.rishikeshRiver),
    activities: hero(TRAVEL_IMAGES.adventureRafting),
    hotels: hero(TRAVEL_IMAGES.hotelLake),
    banner: hero(TRAVEL_IMAGES.rishikeshRiver),
  },
  udaipur: {
    hero: hero(TRAVEL_IMAGES.udaipurLake),
    places: hero(TRAVEL_IMAGES.rajasthanPalace),
    activities: hero(TRAVEL_IMAGES.jaipurFort),
    hotels: hero(TRAVEL_IMAGES.hotelLuxury),
    banner: hero(TRAVEL_IMAGES.udaipurLake),
  },
  delhi: {
    hero: hero(TRAVEL_IMAGES.delhiMonument),
    places: hero(TRAVEL_IMAGES.goldenTriangle),
    activities: hero(TRAVEL_IMAGES.roadTripIndia),
    hotels: hero(TRAVEL_IMAGES.hotelLuxury),
    banner: hero(TRAVEL_IMAGES.delhiMonument),
  },
  india: {
    hero: HERO_IMAGES.packages,
    places: HERO_IMAGES.gallery,
    activities: HERO_IMAGES.terms,
    hotels: HERO_IMAGES.hotels,
    banner: HERO_IMAGES.blog,
  },
};

const DESTINATION_ALIASES: Record<string, string> = {
  "old manali": "manali",
  kullu: "manali",
  solang: "manali",
  "pink city": "jaipur",
  srinagar: "kashmir",
  gulmarg: "kashmir",
  munnar: "kerala",
  alleppey: "kerala",
  kochi: "kerala",
  cochin: "kerala",
};

/** Pick image set key from keyword — route blogs use the destination city (e.g. Jaipur to Manali → Manali). */
export function resolveBlogImageKey(keyword: string, explicitDestination?: string): string {
  const routeMatch = keyword.match(
    /(?:[\w\s]+?)\s+to\s+([\w\s]+?)(?:\s+distance|\s+by\s+road|\s+route|\s+trip)?/i
  );
  if (routeMatch) {
    const toCity = routeMatch[1].trim().toLowerCase();
    for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
      if (toCity.includes(alias)) return key;
    }
    for (const key of Object.keys(DESTINATION_IMAGES)) {
      if (key !== "india" && toCity.includes(key)) return key;
    }
  }

  const haystack = `${keyword} ${explicitDestination ?? ""}`.toLowerCase();
  for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
    if (haystack.includes(alias)) return key;
  }
  for (const key of Object.keys(DESTINATION_IMAGES)) {
    if (key !== "india" && haystack.includes(key)) return key;
  }
  return "india";
}

export function getDestinationImageSet(
  keyword: string,
  explicitDestination?: string
): DestinationImageSet {
  const key = resolveBlogImageKey(keyword, explicitDestination);
  return DESTINATION_IMAGES[key] ?? DESTINATION_IMAGES.india;
}

/** Build image prompts with real destination-matched photos (not generic placeholders). */
export function getBlogImagePrompts(
  keyword: string,
  destination?: string
): BlogImagePrompt[] {
  const dest = destination?.trim() || "India";
  const images = getDestinationImageSet(keyword, destination);
  const imageKey = resolveBlogImageKey(keyword, destination);

  return [
    {
      id: "hero",
      label: "Destination Hero",
      prompt: `Wide cinematic hero banner of ${dest}, golden hour, travel photography, no text`,
      url: images.hero,
    },
    {
      id: "places",
      label: "Top Places",
      prompt: `Collage of famous landmarks and scenic spots in ${dest}, vibrant, editorial style`,
      url: images.places,
    },
    {
      id: "activities",
      label: "Adventure Activities",
      prompt: `Adventure activities in ${dest}: trekking, rafting, paragliding, action travel photo`,
      url: images.activities,
    },
    {
      id: "hotels",
      label: "Hotels & Stays",
      prompt: `Luxury and budget hotels in ${dest}, mountain or beach resort, warm lighting`,
      url: images.hotels,
    },
    {
      id: "banner",
      label: "Travel Banner",
      prompt: `Professional travel banner for ${keyword}, Indian landscape, editorial`,
      url: keyword.toLowerCase().includes("distance") || keyword.toLowerCase().includes(" to ")
        ? hero(TRAVEL_IMAGES.roadTripIndia)
        : images.banner,
    },
  ].map((item) => ({
    ...item,
    prompt: `${item.prompt} [${imageKey}]`,
  }));
}

export function getBlogFeaturedImage(keyword: string, destination?: string): string {
  const prompts = getBlogImagePrompts(keyword, destination);
  const route =
    keyword.toLowerCase().includes("distance") || keyword.toLowerCase().includes(" to ");
  if (route) {
    const banner = prompts.find((p) => p.id === "banner");
    return banner?.url ?? prompts[0].url;
  }
  return prompts[0].url;
}
