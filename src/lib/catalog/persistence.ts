import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

export class CatalogPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogPersistenceError";
  }
}

export function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** `null` = load failed (do not treat as empty). `[]` = collection truly has no documents. */
export async function loadCatalogCollection<T extends { id: string }>(
  collection: string
): Promise<T[] | null> {
  if (!isAdminEnvConfigured()) return null;

  try {
    const db = await getSafeAdminDb();
    if (!db) return null;

    const snap = await db.collection(collection).limit(500).get();
    return snap.docs.map((doc) => {
      const data = doc.data() as T;
      return { ...data, id: data.id ?? doc.id };
    });
  } catch (error) {
    console.error(`Firebase load ${collection} failed:`, error);
    return null;
  }
}

export async function readCatalogItem<T extends { id: string }>(
  collection: string,
  id: string
): Promise<T | null> {
  if (!isAdminEnvConfigured()) return null;

  try {
    const db = await getSafeAdminDb();
    if (!db) return null;

    const snap = await db.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as T;
    return { ...data, id: data.id ?? snap.id };
  } catch (error) {
    console.error(`Firebase read ${collection}/${id} failed:`, error);
    return null;
  }
}

export async function persistCatalogItem<T extends { id: string }>(
  collection: string,
  item: T
): Promise<void> {
  if (!isAdminEnvConfigured()) {
    throw new CatalogPersistenceError(
      `Cannot persist ${collection}/${item.id}: Firebase Admin is not configured`
    );
  }

  const db = await getSafeAdminDb();
  if (!db) {
    throw new CatalogPersistenceError(
      `Cannot persist ${collection}/${item.id}: Firebase Admin DB unavailable`
    );
  }

  const payload = sanitizeForFirestore(item);
  await db.collection(collection).doc(item.id).set(payload);

  const verify = await readCatalogItem<T>(collection, item.id);
  if (!verify) {
    throw new CatalogPersistenceError(
      `Persist verify failed: ${collection}/${item.id} not found after write`
    );
  }
}

/** Batch-write catalog items (used by admin seed actions). */
export async function persistCatalogItemsBatch<T extends { id: string }>(
  collection: string,
  items: T[]
): Promise<void> {
  if (!isAdminEnvConfigured()) {
    throw new CatalogPersistenceError(
      `Cannot batch persist ${collection}: Firebase Admin is not configured`
    );
  }

  const db = await getSafeAdminDb();
  if (!db) {
    throw new CatalogPersistenceError(
      `Cannot batch persist ${collection}: Firebase Admin DB unavailable`
    );
  }

  const BATCH_SIZE = 400;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = items.slice(i, i + BATCH_SIZE);
    for (const item of chunk) {
      const ref = db.collection(collection).doc(item.id);
      batch.set(ref, sanitizeForFirestore(item));
    }
    await batch.commit();
  }
}

export async function deleteCatalogItem(
  collection: string,
  id: string
): Promise<void> {
  if (!isAdminEnvConfigured()) {
    throw new CatalogPersistenceError(
      `Cannot delete ${collection}/${id}: Firebase Admin is not configured`
    );
  }

  const db = await getSafeAdminDb();
  if (!db) {
    throw new CatalogPersistenceError(
      `Cannot delete ${collection}/${id}: Firebase Admin DB unavailable`
    );
  }

  await db.collection(collection).doc(id).delete();
}

export async function seedCatalogIfEmpty<T extends { id: string }>(
  collection: string,
  seedItems: T[]
): Promise<T[]> {
  const remote = await loadCatalogCollection<T>(collection);
  if (remote === null) {
    throw new CatalogPersistenceError(
      `Cannot seed ${collection}: failed to read collection (refusing to overwrite)`
    );
  }
  if (remote.length > 0) return remote;

  await persistCatalogItemsBatch(collection, seedItems);
  return seedItems;
}
