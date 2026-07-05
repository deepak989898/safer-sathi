import type { DestinationSuggestion } from "@/lib/tripjack-hotels/catalog-types";

/** Popular Indian hotel hubs — used when Firestore catalog is empty or still syncing. */
const FALLBACK_DESTINATIONS: Array<{
  label: string;
  searchKeys: string[];
  country: string;
}> = [
  { label: "Goa", searchKeys: ["goa"], country: "India" },
  { label: "New Delhi", searchKeys: ["delhi", "new delhi"], country: "India" },
  { label: "Mumbai", searchKeys: ["mumbai", "bombay"], country: "India" },
  { label: "Jaipur", searchKeys: ["jaipur"], country: "India" },
  { label: "Manali", searchKeys: ["manali"], country: "India" },
  { label: "Bangalore", searchKeys: ["bangalore", "bengaluru"], country: "India" },
  { label: "Shimla", searchKeys: ["shimla"], country: "India" },
  { label: "Udaipur", searchKeys: ["udaipur"], country: "India" },
  { label: "Hyderabad", searchKeys: ["hyderabad"], country: "India" },
  { label: "Chennai", searchKeys: ["chennai", "madras"], country: "India" },
  { label: "Kolkata", searchKeys: ["kolkata", "calcutta"], country: "India" },
  { label: "Pune", searchKeys: ["pune"], country: "India" },
  { label: "Agra", searchKeys: ["agra"], country: "India" },
  { label: "Kerala", searchKeys: ["kerala", "kochi", "cochin", "munnar"], country: "India" },
  { label: "Rishikesh", searchKeys: ["rishikesh"], country: "India" },
];

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function rankFallback(
  label: string,
  searchKeys: string[],
  query: string
): number {
  const q = normalizeQuery(query);
  if (!q) return 1;
  if (searchKeys.some((key) => key === q) || label.toLowerCase() === q) return 0;
  if (searchKeys.some((key) => key.startsWith(q)) || label.toLowerCase().startsWith(q)) return 1;
  if (searchKeys.some((key) => key.includes(q)) || label.toLowerCase().includes(q)) return 2;
  return 99;
}

function toSuggestion(
  dest: (typeof FALLBACK_DESTINATIONS)[number]
): DestinationSuggestion {
  return {
    id: `fallback_${dest.searchKeys[0]}`,
    type: "city",
    label: dest.label,
    subtitle: `${dest.country} · popular destination`,
    hotelCount: 0,
    hids: [],
  };
}

export function suggestFallbackDestinations(
  query: string,
  limit = 12
): DestinationSuggestion[] {
  const q = normalizeQuery(query);

  if (!q) {
    return FALLBACK_DESTINATIONS.slice(0, limit).map(toSuggestion);
  }

  return FALLBACK_DESTINATIONS.map((dest) => ({
    dest,
    rank: rankFallback(dest.label, dest.searchKeys, q),
  }))
    .filter((row) => row.rank <= 2)
    .sort((a, b) => a.rank - b.rank || a.dest.label.localeCompare(b.dest.label))
    .slice(0, limit)
    .map((row) => toSuggestion(row.dest));
}

export function matchFallbackDestinationLabel(query: string): string | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  const match = FALLBACK_DESTINATIONS.find(
    (dest) =>
      rankFallback(dest.label, dest.searchKeys, q) <= 1 ||
      dest.searchKeys.some((key) => key === q || key.startsWith(q))
  );
  return match?.label ?? null;
}
