/** When Firestore has data, use it as the source of truth (no seed overlay). */
export function mergeCatalogById<T extends { id: string }>(
  remote: T[],
  seed: T[]
): T[] {
  if (remote.length > 0) return remote;
  return seed;
}
