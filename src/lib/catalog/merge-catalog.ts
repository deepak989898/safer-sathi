/** Merge remote catalog with seed fallbacks; remote entries win on duplicate ids. */
export function mergeCatalogById<T extends { id: string }>(
  remote: T[],
  seed: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of seed) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}
