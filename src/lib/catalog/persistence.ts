import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

export function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadCatalogCollection<T extends { id: string }>(
  collection: string
): Promise<T[]> {
  if (!isAdminEnvConfigured()) return [];

  try {
    const db = await getSafeAdminDb();
    if (!db) return [];

    const snap = await db.collection(collection).limit(500).get();
    return snap.docs.map((doc) => doc.data() as T);
  } catch (error) {
    console.warn(`Firebase load ${collection} failed:`, error);
    return [];
  }
}

export async function persistCatalogItem<T extends { id: string }>(
  collection: string,
  item: T
): Promise<void> {
  if (!isAdminEnvConfigured()) return;

  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(item.id).set(sanitizeForFirestore(item));
  } catch (error) {
    console.warn(`Firebase persist ${collection} failed:`, error);
  }
}

export async function deleteCatalogItem(
  collection: string,
  id: string
): Promise<void> {
  if (!isAdminEnvConfigured()) return;

  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).delete();
  } catch (error) {
    console.warn(`Firebase delete ${collection} failed:`, error);
  }
}

export async function seedCatalogIfEmpty<T extends { id: string }>(
  collection: string,
  seedItems: T[]
): Promise<T[]> {
  const remote = await loadCatalogCollection<T>(collection);
  if (remote.length > 0) return remote;

  if (!isAdminEnvConfigured()) return seedItems;

  try {
    const db = await getSafeAdminDb();
    if (!db) return seedItems;

    for (const item of seedItems) {
      await db.collection(collection).doc(item.id).set(sanitizeForFirestore(item));
    }
    return seedItems;
  } catch (error) {
    console.warn(`Firebase seed ${collection} failed:`, error);
    return seedItems;
  }
}
