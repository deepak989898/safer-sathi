/** Verified working Unsplash URLs (404-safe for production). */
export const TRAVEL_IMAGES = {
  goldenTriangle:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
  keralaBackwaters:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  charDham:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  manaliAdventure:
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
  hotelLuxury:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  hotelLake:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
  beachResort:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  suv:
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
  sedan:
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
  luxuryCar:
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
  bus:
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
  tempo:
    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80",
  sportsCar:
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
} as const;

export const PLACEHOLDER_TRAVEL_IMAGE = TRAVEL_IMAGES.hotelLuxury;

function hero(url: string) {
  return url.replace("w=800", "w=1920");
}

export const HERO_GRADIENT =
  "linear-gradient(135deg, oklch(0.22 0.08 264 / 0.92), oklch(0.52 0.19 264 / 0.75))";

export function heroBackgroundStyle(image: string) {
  return {
    backgroundImage: `${HERO_GRADIENT}, url(${image})`,
    backgroundSize: "cover" as const,
    backgroundPosition: "center" as const,
  };
}

export const HERO_IMAGES = {
  default: hero(TRAVEL_IMAGES.hotelLuxury),
  home: hero(TRAVEL_IMAGES.hotelLuxury),
  packages: hero(TRAVEL_IMAGES.goldenTriangle),
  holidays: hero(TRAVEL_IMAGES.keralaBackwaters),
  gallery: hero(TRAVEL_IMAGES.charDham),
  blog: hero(TRAVEL_IMAGES.hotelLake),
  about: hero(TRAVEL_IMAGES.beachResort),
  checkout: hero(TRAVEL_IMAGES.hotelLuxury),
  assistant: hero(TRAVEL_IMAGES.keralaBackwaters),
  contact: hero(TRAVEL_IMAGES.beachResort),
  faq: hero(TRAVEL_IMAGES.goldenTriangle),
  privacy: hero(TRAVEL_IMAGES.charDham),
  terms: hero(TRAVEL_IMAGES.manaliAdventure),
  reviews: hero(TRAVEL_IMAGES.beachResort),
  myBookings: hero(TRAVEL_IMAGES.goldenTriangle),
  vehicles: hero(TRAVEL_IMAGES.luxuryCar),
  hotels: hero(TRAVEL_IMAGES.hotelLuxury),
  carRental: hero(TRAVEL_IMAGES.sportsCar),
  tempo: hero(TRAVEL_IMAGES.bus),
  bus: hero(TRAVEL_IMAGES.bus),
  airport: hero("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80"),
  cta: hero(TRAVEL_IMAGES.charDham),
} as const;

export const GALLERY_IMAGES = [
  TRAVEL_IMAGES.goldenTriangle,
  TRAVEL_IMAGES.keralaBackwaters,
  TRAVEL_IMAGES.hotelLuxury,
  TRAVEL_IMAGES.beachResort,
  TRAVEL_IMAGES.hotelLake,
  TRAVEL_IMAGES.charDham,
  TRAVEL_IMAGES.bus,
  TRAVEL_IMAGES.tempo,
] as const;

export const HOME_HERO_SLIDES = [
  { image: hero(TRAVEL_IMAGES.hotelLuxury) },
  { image: hero(TRAVEL_IMAGES.keralaBackwaters) },
  { image: hero(TRAVEL_IMAGES.goldenTriangle) },
  { image: hero(TRAVEL_IMAGES.charDham) },
  { image: hero(TRAVEL_IMAGES.beachResort) },
] as const;
