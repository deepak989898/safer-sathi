import type { Hotel, Locale, TourPackage, Vehicle } from "@/types";

export type CatalogSortKey =
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "name_asc"
  | "duration_asc"
  | "seats_desc";

export const HOTEL_SORT_KEYS: CatalogSortKey[] = [
  "price_asc",
  "price_desc",
  "rating_desc",
  "name_asc",
];

export const VEHICLE_SORT_KEYS: CatalogSortKey[] = [
  "price_asc",
  "price_desc",
  "rating_desc",
  "seats_desc",
  "name_asc",
];

export const PACKAGE_SORT_KEYS: CatalogSortKey[] = [
  "price_asc",
  "price_desc",
  "duration_asc",
  "rating_desc",
  "name_asc",
];

export function sortHotels(hotels: Hotel[], sortKey: CatalogSortKey): Hotel[] {
  const list = [...hotels];
  switch (sortKey) {
    case "price_asc":
      return list.sort((a, b) => a.priceFrom - b.priceFrom);
    case "price_desc":
      return list.sort((a, b) => b.priceFrom - a.priceFrom);
    case "rating_desc":
      return list.sort((a, b) => b.rating - a.rating);
    case "name_asc":
      return list.sort((a, b) => a.name.en.localeCompare(b.name.en));
    default:
      return list;
  }
}

export function sortVehicles(
  vehicles: Vehicle[],
  sortKey: CatalogSortKey
): Vehicle[] {
  const list = [...vehicles];
  switch (sortKey) {
    case "price_asc":
      return list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    case "price_desc":
      return list.sort((a, b) => b.pricePerDay - a.pricePerDay);
    case "rating_desc":
      return list.sort((a, b) => b.rating - a.rating);
    case "seats_desc":
      return list.sort((a, b) => b.seats - a.seats);
    case "name_asc":
      return list.sort((a, b) => a.name.en.localeCompare(b.name.en));
    default:
      return list;
  }
}

export function sortPackages(
  packages: TourPackage[],
  sortKey: CatalogSortKey
): TourPackage[] {
  const list = [...packages];
  switch (sortKey) {
    case "price_asc":
      return list.sort((a, b) => a.price - b.price);
    case "price_desc":
      return list.sort((a, b) => b.price - a.price);
    case "duration_asc":
      return list.sort((a, b) => a.duration - b.duration);
    case "rating_desc":
      return list.sort((a, b) => b.rating - a.rating);
    case "name_asc":
      return list.sort((a, b) => a.title.en.localeCompare(b.title.en));
    default:
      return list;
  }
}

export function getSortLabel(
  locale: Locale,
  key: CatalogSortKey
): string {
  const labels: Record<Locale, Record<CatalogSortKey, string>> = {
    en: {
      price_asc: "Price: Low to High",
      price_desc: "Price: High to Low",
      rating_desc: "Top Rated",
      name_asc: "Name: A to Z",
      duration_asc: "Duration: Shortest",
      seats_desc: "Most Seats",
    },
    hi: {
      price_asc: "कीमत: कम से ज्यादा",
      price_desc: "कीमत: ज्यादा से कम",
      rating_desc: "सर्वश्रेष्ठ रेटिंग",
      name_asc: "नाम: अ से ज्ञ",
      duration_asc: "अवधि: सबसे कम",
      seats_desc: "सबसे अधिक सीटें",
    },
  };
  return labels[locale][key];
}
