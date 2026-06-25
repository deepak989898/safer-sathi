/** Unique travel images per destination — avoid cross-destination reuse. */

export type ImageSlotType =
  | "featured"
  | "destination"
  | "activity"
  | "attraction"
  | "experience";

export interface DestinationImageAsset {
  id: string;
  label: string;
  type: ImageSlotType;
  url: string;
  attraction?: string;
}

export interface DestinationImageCategory {
  key: string;
  displayName: string;
  images: DestinationImageAsset[];
}

function img(photoId: string, w = 1920): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&q=80&auto=format&fit=crop`;
}

const MANALI: DestinationImageAsset[] = [
  { id: "manali-hero", label: "Manali Mountains", type: "featured", url: img("1506905925346-21bda4d32df4"), attraction: "Manali Valley" },
  { id: "manali-solang", label: "Solang Valley", type: "attraction", url: img("1464822759023-fed622b2a3ba"), attraction: "Solang Valley" },
  { id: "manali-hadimba", label: "Hadimba Temple", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Hadimba Temple" },
  { id: "manali-rohtang", label: "Rohtang Pass", type: "destination", url: img("1626621341517-bbf3d9990a23"), attraction: "Rohtang Pass" },
  { id: "manali-mall", label: "Mall Road Manali", type: "experience", url: img("1549317661-bd32c8ce0db2"), attraction: "Mall Road" },
  { id: "manali-adventure", label: "Paragliding Manali", type: "activity", url: img("1486911272894-bc2f4f8e7f0c"), attraction: "Adventure Sports" },
  { id: "manali-river", label: "Beas River", type: "destination", url: img("1528181304800-259b078485af"), attraction: "Beas River" },
  { id: "manali-resort", label: "Mountain Resort", type: "experience", url: img("1571896349842-33c89424de2d"), attraction: "Mountain Stay" },
];

const GOA: DestinationImageAsset[] = [
  { id: "goa-hero", label: "Goa Beach", type: "featured", url: img("1507525428034-b723cf961d3e"), attraction: "Goa Coast" },
  { id: "goa-baga", label: "Baga Beach", type: "attraction", url: img("1513622470850-e444f043c3af"), attraction: "Baga Beach" },
  { id: "goa-calangute", label: "Calangute Beach", type: "attraction", url: img("1519046900754-f63f944f425e"), attraction: "Calangute Beach" },
  { id: "goa-candolim", label: "Candolim Beach", type: "attraction", url: img("1505142468610-359e7d316be0"), attraction: "Candolim Beach" },
  { id: "goa-watersports", label: "Water Sports Goa", type: "activity", url: img("1559827260-dc66d52bef19"), attraction: "Water Sports" },
  { id: "goa-sunset", label: "Goa Sunset", type: "experience", url: img("1539650116574-75c0c6d73ef6"), attraction: "Sunset" },
  { id: "goa-shacks", label: "Beach Shacks", type: "experience", url: img("1559827260-dc66d52bef19", 1600), attraction: "Beach Life" },
  { id: "goa-resort", label: "Beach Resort", type: "destination", url: img("1566073771259-6a8506099945"), attraction: "Resort Stay" },
];

const SHIMLA: DestinationImageAsset[] = [
  { id: "shimla-hero", label: "Shimla Hills", type: "featured", url: img("1626621341517-bbf3d9990a23"), attraction: "Shimla" },
  { id: "shimla-ridge", label: "The Ridge", type: "attraction", url: img("1506905925346-21bda4d32df4"), attraction: "The Ridge" },
  { id: "shimla-mall", label: "Mall Road Shimla", type: "attraction", url: img("1464822759023-fed622b2a3ba"), attraction: "Mall Road" },
  { id: "shimla-kufri", label: "Kufri Snow", type: "destination", url: img("1602210294080-0fdf9a24f935"), attraction: "Kufri" },
  { id: "shimla-toy", label: "Toy Train", type: "experience", url: img("1477587456223-d9cfcede3a2f"), attraction: "Toy Train" },
  { id: "shimla-trek", label: "Hill Trekking", type: "activity", url: img("1486911272894-bc2f4f8e7f0c"), attraction: "Trekking" },
  { id: "shimla-christ", label: "Christ Church", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Christ Church" },
  { id: "shimla-resort", label: "Hill Resort", type: "experience", url: img("1571896349842-33c89424de2d"), attraction: "Hill Stay" },
];

const KASHMIR: DestinationImageAsset[] = [
  { id: "kashmir-hero", label: "Dal Lake", type: "featured", url: img("1596496181924-3568d664d3ae"), attraction: "Dal Lake" },
  { id: "kashmir-shikara", label: "Shikara Ride", type: "experience", url: img("1537953773395-29b1661fff74"), attraction: "Shikara" },
  { id: "kashmir-gulmarg", label: "Gulmarg Meadows", type: "destination", url: img("1464822759023-fed622b2a3ba"), attraction: "Gulmarg" },
  { id: "kashmir-pahalgam", label: "Pahalgam Valley", type: "attraction", url: img("1506905925346-21bda4d32df4"), attraction: "Pahalgam" },
  { id: "kashmir-sonamarg", label: "Sonamarg", type: "attraction", url: img("1626621341517-bbf3d9990a23"), attraction: "Sonamarg" },
  { id: "kashmir-snow", label: "Snow Activities", type: "activity", url: img("1602210294080-0fdf9a24f935"), attraction: "Snow Sports" },
  { id: "kashmir-garden", label: "Mughal Gardens", type: "attraction", url: img("1477587456223-d9cfcede3a2f"), attraction: "Gardens" },
  { id: "kashmir-houseboat", label: "Houseboat Stay", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Houseboat" },
];

const KERALA: DestinationImageAsset[] = [
  { id: "kerala-hero", label: "Kerala Backwaters", type: "featured", url: img("1537953773395-29b1661fff74"), attraction: "Backwaters" },
  { id: "kerala-houseboat", label: "Alleppey Houseboat", type: "experience", url: img("1507525428034-b723cf961d3e"), attraction: "Alleppey" },
  { id: "kerala-munnar", label: "Munnar Tea Gardens", type: "destination", url: img("1506905925346-21bda4d32df4"), attraction: "Munnar" },
  { id: "kerala-beach", label: "Kovalam Beach", type: "attraction", url: img("1519046900754-f63f944f425e"), attraction: "Kovalam" },
  { id: "kerala-wildlife", label: "Wildlife Safari", type: "activity", url: img("1486911272894-bc2f4f8e7f0c"), attraction: "Wildlife" },
  { id: "kerala-ayurveda", label: "Ayurveda Retreat", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Ayurveda" },
  { id: "kerala-fort", label: "Fort Kochi", type: "attraction", url: img("1599661047819-382153ed0aac"), attraction: "Fort Kochi" },
  { id: "kerala-cuisine", label: "Kerala Cuisine", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Local Food" },
];

const JAIPUR: DestinationImageAsset[] = [
  { id: "jaipur-hero", label: "Amer Fort", type: "featured", url: img("1599661047819-382153ed0aac"), attraction: "Amer Fort" },
  { id: "jaipur-hawa", label: "Hawa Mahal", type: "attraction", url: img("1609137144323-b4cbcec4b5c0"), attraction: "Hawa Mahal" },
  { id: "jaipur-city", label: "City Palace", type: "attraction", url: img("1477587456223-d9cfcede3a2f"), attraction: "City Palace" },
  { id: "jaipur-bazaar", label: "Pink City Bazaar", type: "experience", url: img("1587474260584-1acab24d2d54"), attraction: "Bazaars" },
  { id: "jaipur-elephant", label: "Fort Safari", type: "activity", url: img("1518548419970-58e984b6eb4c"), attraction: "Fort Tour" },
  { id: "jaipur-desert", label: "Rajasthan Landscape", type: "destination", url: img("1469854523086-cc02fe5d8800"), attraction: "Rajasthan" },
  { id: "jaipur-palace", label: "Royal Palace", type: "attraction", url: img("1582719478250-c89cae4dc85b"), attraction: "Palace" },
  { id: "jaipur-hotel", label: "Heritage Hotel", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Heritage Stay" },
];

const DUBAI: DestinationImageAsset[] = [
  { id: "dubai-hero", label: "Dubai Skyline", type: "featured", url: img("1531366936339-94c690b16626"), attraction: "Dubai" },
  { id: "dubai-burj", label: "Burj Khalifa", type: "attraction", url: img("1512453979798-5ea266f8880c"), attraction: "Burj Khalifa" },
  { id: "dubai-desert", label: "Desert Safari", type: "activity", url: img("1469854523086-cc02fe5d8800"), attraction: "Desert Safari" },
  { id: "dubai-marina", label: "Dubai Marina", type: "destination", url: img("1518684079-3c830dcef090"), attraction: "Marina" },
  { id: "dubai-mall", label: "Shopping & Luxury", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Luxury" },
  { id: "dubai-beach", label: "JBR Beach", type: "attraction", url: img("1507525428034-b723cf961d3e"), attraction: "JBR Beach" },
  { id: "dubai-mosque", label: "Jumeirah Mosque", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Mosque" },
  { id: "dubai-fountain", label: "Dubai Fountain", type: "experience", url: img("1531366936339-94c690b16626", 1600), attraction: "Fountain Show" },
];

const THAILAND: DestinationImageAsset[] = [
  { id: "thailand-hero", label: "Thailand Beach", type: "featured", url: img("1552465011-ec5ae0cbed09"), attraction: "Thailand" },
  { id: "thailand-temple", label: "Thai Temple", type: "attraction", url: img("1548013146-72479768bada"), attraction: "Temple" },
  { id: "thailand-island", label: "Island Hopping", type: "activity", url: img("1505142468610-359e7d316be0"), attraction: "Islands" },
  { id: "thailand-market", label: "Floating Market", type: "experience", url: img("1559827260-dc66d52bef19"), attraction: "Markets" },
  { id: "thailand-bangkok", label: "Bangkok City", type: "destination", url: img("1508009603885-50cf7c579365"), attraction: "Bangkok" },
  { id: "thailand-phuket", label: "Phuket Coast", type: "attraction", url: img("1513622470850-e444f043c3af"), attraction: "Phuket" },
  { id: "thailand-food", label: "Thai Street Food", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Cuisine" },
  { id: "thailand-resort", label: "Beach Resort", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Resort" },
];

const DELHI: DestinationImageAsset[] = [
  { id: "delhi-hero", label: "Delhi Monument", type: "featured", url: img("1587474260584-1acab24d2d54"), attraction: "Delhi" },
  { id: "delhi-red", label: "Red Fort", type: "attraction", url: img("1599661047819-382153ed0aac"), attraction: "Red Fort" },
  { id: "delhi-qutub", label: "Qutub Minar", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Qutub Minar" },
  { id: "delhi-india-gate", label: "India Gate", type: "attraction", url: img("1609137144323-b4cbcec4b5c0"), attraction: "India Gate" },
  { id: "delhi-bazaar", label: "Chandni Chowk", type: "experience", url: img("1477587456223-d9cfcede3a2f"), attraction: "Old Delhi" },
  { id: "delhi-food", label: "Street Food", type: "activity", url: img("1582719478250-c89cae4dc85b"), attraction: "Food Walk" },
  { id: "delhi-metro", label: "City Travel", type: "destination", url: img("1469854523086-cc02fe5d8800"), attraction: "City Tour" },
  { id: "delhi-hotel", label: "Delhi Hotel", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Stay" },
];

const UDAIPUR: DestinationImageAsset[] = [
  { id: "udaipur-hero", label: "Lake Pichola", type: "featured", url: img("1587474260584-1acab24d2d54"), attraction: "Lake Pichola" },
  { id: "udaipur-palace", label: "City Palace Udaipur", type: "attraction", url: img("1477587456223-d9cfcede3a2f"), attraction: "City Palace" },
  { id: "udaipur-boat", label: "Boat Ride", type: "activity", url: img("1537953773395-29b1661fff74"), attraction: "Boat Ride" },
  { id: "udaipur-sunset", label: "Sunset Lake", type: "experience", url: img("1539650116574-75c0c6d73ef6"), attraction: "Sunset" },
  { id: "udaipur-jag", label: "Jag Mandir", type: "attraction", url: img("1599661047819-382153ed0aac"), attraction: "Jag Mandir" },
  { id: "udaipur-old", label: "Old City Lanes", type: "destination", url: img("1609137144323-b4cbcec4b5c0"), attraction: "Old City" },
  { id: "udaipur-haveli", label: "Heritage Haveli", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Haveli" },
  { id: "udaipur-cafe", label: "Rooftop Dining", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Dining" },
];

const RISHIKESH: DestinationImageAsset[] = [
  { id: "rishi-hero", label: "Ganges Rishikesh", type: "featured", url: img("1528181304800-259b078485af"), attraction: "Ganges" },
  { id: "rishi-raft", label: "River Rafting", type: "activity", url: img("1549317661-bd32c8ce0db2"), attraction: "Rafting" },
  { id: "rishi-bridge", label: "Laxman Jhula", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Laxman Jhula" },
  { id: "rishi-yoga", label: "Yoga Ashram", type: "experience", url: img("1506905925346-21bda4d32df4"), attraction: "Yoga" },
  { id: "rishi-trek", label: "Himalayan Trek", type: "activity", url: img("1486911272894-bc2f4f8e7f0c"), attraction: "Trekking" },
  { id: "rishi-aarti", label: "Ganga Aarti", type: "experience", url: img("1596496181924-3568d664d3ae"), attraction: "Ganga Aarti" },
  { id: "rishi-cafe", label: "Riverside Café", type: "destination", url: img("1571896349842-33c89424de2d"), attraction: "Cafés" },
  { id: "rishi-camp", label: "Riverside Camp", type: "experience", url: img("1626621341517-bbf3d9990a23"), attraction: "Camping" },
];

const INDIA_GENERIC: DestinationImageAsset[] = [
  { id: "india-hero", label: "India Travel", type: "featured", url: img("1582719478250-c89cae4dc85b"), attraction: "India" },
  { id: "india-road", label: "Road Trip India", type: "experience", url: img("1469854523086-cc02fe5d8800"), attraction: "Road Trip" },
  { id: "india-mountains", label: "Himalayas", type: "destination", url: img("1506905925346-21bda4d32df4"), attraction: "Mountains" },
  { id: "india-beach", label: "Coastal India", type: "destination", url: img("1507525428034-b723cf961d3e"), attraction: "Beach" },
  { id: "india-heritage", label: "Heritage Sites", type: "attraction", url: img("1599661047819-382153ed0aac"), attraction: "Heritage" },
  { id: "india-adventure", label: "Adventure Travel", type: "activity", url: img("1549317661-bd32c8ce0db2"), attraction: "Adventure" },
  { id: "india-hotel", label: "Travel Stay", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Hotels" },
  { id: "india-culture", label: "Cultural Experience", type: "experience", url: img("1477587456223-d9cfcede3a2f"), attraction: "Culture" },
];

export const DESTINATION_IMAGE_CATALOG: Record<string, DestinationImageCategory> = {
  manali: { key: "manali", displayName: "Manali", images: MANALI },
  goa: { key: "goa", displayName: "Goa", images: GOA },
  shimla: { key: "shimla", displayName: "Shimla", images: SHIMLA },
  kashmir: { key: "kashmir", displayName: "Kashmir", images: KASHMIR },
  kerala: { key: "kerala", displayName: "Kerala", images: KERALA },
  jaipur: { key: "jaipur", displayName: "Jaipur", images: JAIPUR },
  dubai: { key: "dubai", displayName: "Dubai", images: DUBAI },
  thailand: { key: "thailand", displayName: "Thailand", images: THAILAND },
  delhi: { key: "delhi", displayName: "Delhi", images: DELHI },
  udaipur: { key: "udaipur", displayName: "Udaipur", images: UDAIPUR },
  rishikesh: { key: "rishikesh", displayName: "Rishikesh", images: RISHIKESH },
  india: { key: "india", displayName: "India", images: INDIA_GENERIC },
};

export const DESTINATION_ALIASES: Record<string, string> = {
  "old manali": "manali",
  kullu: "manali",
  solang: "manali",
  rohtang: "manali",
  hadimba: "manali",
  "pink city": "jaipur",
  amer: "jaipur",
  srinagar: "kashmir",
  gulmarg: "kashmir",
  dal: "kashmir",
  munnar: "kerala",
  alleppey: "kerala",
  kochi: "kerala",
  cochin: "kerala",
  kovalam: "kerala",
  baga: "goa",
  calangute: "goa",
  candolim: "goa",
  bangkok: "thailand",
  phuket: "thailand",
  pattaya: "thailand",
  burj: "dubai",
  "new delhi": "delhi",
  agra: "delhi",
  taj: "delhi",
  leh: "kashmir",
  ladakh: "kashmir",
  kasol: "manali",
  kufri: "shimla",
  pahalgam: "kashmir",
};

export function resolveDestinationCategoryKey(keyword: string, explicitDestination?: string): string {
  const routeMatch = keyword.match(
    /(?:[\w\s]+?)\s+to\s+([\w\s]+?)(?:\s+distance|\s+by\s+road|\s+route|\s+trip)?/i
  );
  if (routeMatch) {
    const toCity = routeMatch[1].trim().toLowerCase();
    for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
      if (toCity.includes(alias)) return key;
    }
    for (const key of Object.keys(DESTINATION_IMAGE_CATALOG)) {
      if (key !== "india" && toCity.includes(key)) return key;
    }
  }

  const haystack = `${keyword} ${explicitDestination ?? ""}`.toLowerCase();
  for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
    if (haystack.includes(alias)) return key;
  }
  for (const key of Object.keys(DESTINATION_IMAGE_CATALOG)) {
    if (key !== "india" && haystack.includes(key)) return key;
  }
  return "india";
}

export function getDestinationCategory(key: string): DestinationImageCategory {
  return DESTINATION_IMAGE_CATALOG[key] ?? DESTINATION_IMAGE_CATALOG.india;
}

export function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}
