import { demoPackages } from "@/data/demo-data";
import type { PackagePublishStatus, TourPackage } from "@/types";

let packagesStore: TourPackage[] = demoPackages.map((pkg) => ({
  ...pkg,
  publishStatus: "published" as PackagePublishStatus,
  proposedBy: "admin",
}));

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
  packagesStore = [pkg, ...packagesStore];
  return pkg;
}

export function upsertPackageInStore(pkg: TourPackage): TourPackage {
  packagesStore = [pkg, ...packagesStore.filter((p) => p.id !== pkg.id)];
  return pkg;
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
  return packagesStore[index];
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
}
