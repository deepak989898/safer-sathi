export function normalizeCityKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatCityLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Unknown";
  return trimmed.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export interface CityFilterOption {
  key: string;
  label: string;
  count: number;
}

export function buildCityCounts<T>(
  items: T[],
  getCities: (item: T) => string[]
): CityFilterOption[] {
  const map = new Map<string, { label: string; count: number }>();

  for (const item of items) {
    const seen = new Set<string>();
    for (const raw of getCities(item)) {
      const key = normalizeCityKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const label = formatCityLabel(raw);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { label, count: 1 });
      }
    }
  }

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterByCity<T>(
  items: T[],
  selectedCity: string | null,
  getCities: (item: T) => string[]
): T[] {
  if (!selectedCity) return items;
  return items.filter((item) =>
    getCities(item).some((city) => normalizeCityKey(city) === selectedCity)
  );
}

/** Match any of the selected city keys (normalized). */
export function filterByCities<T>(
  items: T[],
  selectedCities: string[],
  getCities: (item: T) => string[]
): T[] {
  if (selectedCities.length === 0) return items;
  const selected = new Set(selectedCities.map(normalizeCityKey));
  return items.filter((item) =>
    getCities(item).some((city) => selected.has(normalizeCityKey(city)))
  );
}

/** Primary destination city used for package catalog filters (first city in itinerary). */
export function getPackagePrimaryCity(cities: string[]): string | null {
  const primary = cities.map((c) => c.trim()).find(Boolean);
  return primary ?? null;
}

function packageDestinationLabel(title: string, primaryCity: string): string {
  const shortTitle = title
    .replace(/\s+(Tour|Package|Holiday|Trip|Getaway)$/i, "")
    .trim();
  const titleKey = normalizeCityKey(shortTitle);
  const cityKey = normalizeCityKey(primaryCity);

  if (
    shortTitle &&
    titleKey !== cityKey &&
    !shortTitle.toLowerCase().includes(primaryCity.toLowerCase())
  ) {
    return `${shortTitle} (${primaryCity})`;
  }
  return formatCityLabel(primaryCity);
}

/**
 * One filter option per published package primary destination.
 * Avoids listing every itinerary stop (e.g. Agra, Alleppey) as separate filters.
 */
export function buildPackagePlaceFilterOptions(
  packages: { id: string; title: { en: string }; cities?: string[] }[]
): { id: string; label: string }[] {
  const map = new Map<string, { label: string; count: number }>();

  for (const pkg of packages) {
    const primary = getPackagePrimaryCity(pkg.cities ?? []);
    if (!primary) continue;

    const key = normalizeCityKey(primary);
    const label = packageDestinationLabel(pkg.title.en, primary);
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
      if (label.length > existing.label.length) {
        existing.label = label;
      }
    } else {
      map.set(key, { label, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([id, value]) => ({
      id,
      label: `${value.label} (${value.count})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Match packages when a primary-destination filter is selected. */
export function filterPackagesByPrimaryCities<T extends { cities?: string[] }>(
  packages: T[],
  selectedKeys: string[]
): T[] {
  if (selectedKeys.length === 0) return packages;
  const selected = new Set(selectedKeys.map(normalizeCityKey));

  return packages.filter((pkg) => {
    const cities = (pkg.cities ?? []).map((c) => c.trim()).filter(Boolean);
    const primary = getPackagePrimaryCity(cities);
    if (primary && selected.has(normalizeCityKey(primary))) return true;
    return cities.some((city) => selected.has(normalizeCityKey(city)));
  });
}
