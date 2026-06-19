import {
  deleteCatalogItem,
  persistCatalogItem,
  persistCatalogItemsBatch,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { getSeedPackages } from "@/data/seed-catalog";
import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import type { PackagePublishStatus, TourPackage } from "@/types";

const PACKAGES_COLLECTION = "packages";
const LEGACY_DEMO_PACKAGE_IDS = ["p1", "p2", "p3", "p4"];

let packagesStore: TourPackage[] = [];
let hydratePromise: Promise<void> | null = null;

function upsertInMemory(pkg: TourPackage): TourPackage {
  packagesStore = [pkg, ...packagesStore.filter((p) => p.id !== pkg.id)];
  return pkg;
}

export async function hydratePackagesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const items = await seedCatalogIfEmpty(PACKAGES_COLLECTION, getSeedPackages());
    packagesStore = items;
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
  void upsertPackageInStore(pkg);
  return pkg;
}

export async function upsertPackageInStore(pkg: TourPackage): Promise<TourPackage> {
  const saved = upsertInMemory({
    ...pkg,
    updatedAt: new Date().toISOString(),
  });
  await persistCatalogItem(PACKAGES_COLLECTION, saved);
  return saved;
}

export async function updatePackageInStore(
  id: string,
  updates: Partial<TourPackage>
): Promise<TourPackage | null> {
  const existing = getPackageByIdAdmin(id);
  if (!existing) return null;

  return upsertPackageInStore({
    ...existing,
    ...updates,
    id: existing.id,
  });
}

export async function approvePackageInStore(
  id: string,
  approvedBy: string
): Promise<TourPackage | null> {
  return updatePackageInStore(id, {
    publishStatus: "published",
    approvedBy,
    approvedAt: new Date().toISOString(),
    rejectionReason: undefined,
  });
}

export async function rejectPackageInStore(
  id: string,
  reason?: string
): Promise<TourPackage | null> {
  return updatePackageInStore(id, {
    publishStatus: "rejected",
    rejectionReason: reason,
  });
}

export async function deletePackageFromStore(id: string): Promise<boolean> {
  const exists = getPackageByIdAdmin(id);
  if (!exists) return false;
  packagesStore = packagesStore.filter((p) => p.id !== id);
  await deleteCatalogItem(PACKAGES_COLLECTION, id);
  return true;
}

export function slugExists(slug: string): boolean {
  return packagesStore.some((p) => p.slug === slug);
}

export function resetPackagesStore(): void {
  packagesStore = [];
  hydratePromise = null;
}

export async function publishPackageToWebsite(pkg: TourPackage): Promise<TourPackage> {
  return upsertPackageInStore({
    ...pkg,
    publishStatus: "published",
    updatedAt: new Date().toISOString(),
  });
}

export async function reloadPackagesStore(): Promise<void> {
  resetPackagesStore();
  await hydratePackagesStore();
}

/** Upsert all 20 professional tour packages into Firestore (admin seed action). */
export async function seedTourPackages(): Promise<TourPackage[]> {
  const packages = getTourPackagesSeed();
  await persistCatalogItemsBatch(PACKAGES_COLLECTION, packages);
  await reloadPackagesStore();

  for (const id of LEGACY_DEMO_PACKAGE_IDS) {
    const existing = getPackageByIdAdmin(id);
    if (existing && existing.publishStatus === "published") {
      await upsertPackageInStore({ ...existing, publishStatus: "draft" });
    }
  }

  return getAdminPackages();
}
