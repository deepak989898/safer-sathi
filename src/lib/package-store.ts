import { demoPackages } from "@/data/demo-data";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { PackagePublishStatus, TourPackage } from "@/types";

const PACKAGES_COLLECTION = "packages";

let packagesStore: TourPackage[] = demoPackages.map((pkg) => ({
  ...pkg,
  publishStatus: "published" as PackagePublishStatus,
  proposedBy: "admin",
}));

let hydratePromise: Promise<void> | null = null;

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function upsertInMemory(pkg: TourPackage): TourPackage {
  packagesStore = [pkg, ...packagesStore.filter((p) => p.id !== pkg.id)];
  return pkg;
}

async function persistPublishedPackage(pkg: TourPackage): Promise<void> {
  if (pkg.publishStatus !== "published") return;
  if (!isAdminEnvConfigured()) return;

  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db
      .collection(PACKAGES_COLLECTION)
      .doc(pkg.id)
      .set(sanitizeForFirestore(pkg));
  } catch (error) {
    console.warn("Firebase persist published package failed:", error);
  }
}

async function loadPublishedFromFirestore(): Promise<TourPackage[]> {
  if (!isAdminEnvConfigured()) return [];

  try {
    const db = await getSafeAdminDb();
    if (!db) return [];

    const snap = await db.collection(PACKAGES_COLLECTION).limit(500).get();
    return snap.docs
      .map((doc) => doc.data() as TourPackage)
      .filter((pkg) => pkg.publishStatus === "published");
  } catch (error) {
    console.warn("Firebase load published packages failed:", error);
    return [];
  }
}

export async function hydratePackagesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const remotePublished = await loadPublishedFromFirestore();
    for (const pkg of remotePublished) {
      upsertInMemory(pkg);
    }
  })();

  return hydratePromise;
}

export function getPublishedPackages(): TourPackage[] {
  return packagesStore.filter((p) => p.publishStatus === "published");
}

export function getAdminPackages(status?: PackagePublishStatus): TourPackage[] {
  if (!status) return [...packagesStore];
  return packagesStore.filter((p) => p.publishStatus === status);
}

export function getPackageByIdAdmin(id: string): TourPackage | null {
  return packagesStore.find((p) => p.id === id) ?? null;
}

export function getPublishedPackageBySlug(slug: string): TourPackage | null {
  return (
    packagesStore.find(
      (p) => p.slug === slug && p.publishStatus === "published"
    ) ?? null
  );
}

export function getPublishedPackageById(id: string): TourPackage | null {
  return (
    packagesStore.find((p) => p.id === id && p.publishStatus === "published") ??
    null
  );
}

export function getAllPublishedPackageSlugs(): string[] {
  return getPublishedPackages().map((p) => p.slug);
}

export function addPackageDraft(pkg: TourPackage): TourPackage {
  return upsertPackageInStore(pkg);
}

export function upsertPackageInStore(pkg: TourPackage): TourPackage {
  const saved = upsertInMemory(pkg);
  if (saved.publishStatus === "published") {
    void persistPublishedPackage(saved);
  }
  return saved;
}

export function updatePackageInStore(
  id: string,
  updates: Partial<TourPackage>
): TourPackage | null {
  const index = packagesStore.findIndex((p) => p.id === id);
  if (index === -1) return null;

  packagesStore[index] = {
    ...packagesStore[index],
    ...updates,
    id: packagesStore[index].id,
    updatedAt: new Date().toISOString(),
  };

  const updated = packagesStore[index];
  if (updated.publishStatus === "published") {
    void persistPublishedPackage(updated);
  }
  return updated;
}

export function approvePackageInStore(
  id: string,
  approvedBy: string
): TourPackage | null {
  return updatePackageInStore(id, {
    publishStatus: "published",
    approvedBy,
    approvedAt: new Date().toISOString(),
    rejectionReason: undefined,
  });
}

export function rejectPackageInStore(
  id: string,
  reason?: string
): TourPackage | null {
  return updatePackageInStore(id, {
    publishStatus: "rejected",
    rejectionReason: reason,
  });
}

export function slugExists(slug: string): boolean {
  return packagesStore.some((p) => p.slug === slug);
}

export function resetPackagesStore(): void {
  packagesStore = demoPackages.map((pkg) => ({
    ...pkg,
    publishStatus: "published" as PackagePublishStatus,
    proposedBy: "admin",
  }));
  hydratePromise = null;
}

export async function publishPackageToWebsite(pkg: TourPackage): Promise<TourPackage> {
  const published: TourPackage = {
    ...pkg,
    publishStatus: "published",
    updatedAt: new Date().toISOString(),
  };
  const saved = upsertInMemory(published);
  await persistPublishedPackage(saved);
  return saved;
}
