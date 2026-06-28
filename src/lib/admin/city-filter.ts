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
