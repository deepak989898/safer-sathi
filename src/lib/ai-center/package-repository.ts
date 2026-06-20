import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { generateAiTourPackage } from "@/lib/ai-center/package-generator-agent";
import { addAiCenterLog, getAiCenterSettings, hydrateAiCenterStore } from "@/lib/ai-center/repository";
import type { AiTourPackage, AiPackageStatus } from "@/lib/ai-center/types";
import { upsertPackageInStore } from "@/lib/package-store";
import type { PackageCategory, TourPackage } from "@/types";

const COLLECTION = "tour_packages";

let packageCache: AiTourPackage[] = [];
let hydratePromise: Promise<void> | null = null;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function persistDoc(id: string, data: object): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(COLLECTION).doc(id).set(sanitize(data));
  } catch (error) {
    console.warn(`Firebase persist ${COLLECTION}/${id} failed:`, error);
  }
}

async function deleteDoc(id: string): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(COLLECTION).doc(id).delete();
  } catch (error) {
    console.warn(`Firebase delete ${COLLECTION}/${id} failed:`, error);
  }
}

async function loadAll(): Promise<AiTourPackage[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection(COLLECTION).limit(200).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as AiTourPackage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn(`Firebase load ${COLLECTION} failed:`, error);
    return [];
  }
}

function mergeCache(item: AiTourPackage): void {
  const idx = packageCache.findIndex((p) => p.id === item.id);
  if (idx >= 0) packageCache[idx] = item;
  else packageCache = [item, ...packageCache];
}

export async function hydrateTourPackagesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    packageCache = await loadAll();
  })();
  return hydratePromise;
}

export function listTourPackages(status?: AiPackageStatus): AiTourPackage[] {
  if (!status) return [...packageCache];
  return packageCache.filter((p) => p.status === status);
}

export function getTourPackageById(id: string): AiTourPackage | null {
  return packageCache.find((p) => p.id === id) ?? null;
}

export async function generateTourPackage(input: {
  destination: string;
  durationDays?: number;
  hotelId?: string;
  vehicleId?: string;
  useGeneratedHotel?: boolean;
  useGeneratedVehicle?: boolean;
  travelers?: number;
  marginPercent?: number;
  createdBy: string;
}): Promise<AiTourPackage> {
  await hydrateAiCenterStore();
  const started = Date.now();
  const draft = await generateAiTourPackage(input);
  const now = new Date().toISOString();
  const settings = getAiCenterSettings();

  const pkg: AiTourPackage = {
    ...draft,
    id: `ai_tpkg_${Date.now()}`,
    status: settings.packageAutoDraftEnabled ? "pending_approval" : "draft",
    createdAt: now,
    updatedAt: now,
  };

  mergeCache(pkg);
  await persistDoc(pkg.id, pkg);
  await addAiCenterLog({
    type: "package_generated",
    message: `Generated package: ${pkg.title}`,
    resourceId: pkg.id,
    resourceType: "package",
    durationMs: Date.now() - started,
  });
  return pkg;
}

export async function updateTourPackage(
  id: string,
  updates: Partial<AiTourPackage>
): Promise<AiTourPackage> {
  const existing = getTourPackageById(id);
  if (!existing) throw new Error("Package not found");

  const updated: AiTourPackage = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };
  mergeCache(updated);
  await persistDoc(updated.id, updated);
  return updated;
}

export async function approveTourPackage(
  id: string,
  approvedBy: string
): Promise<AiTourPackage> {
  const updated = await updateTourPackage(id, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
  });
  await addAiCenterLog({
    type: "package_approved",
    message: `Approved package: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "package",
  });
  return updated;
}

export async function rejectTourPackage(
  id: string,
  reason?: string
): Promise<AiTourPackage> {
  const updated = await updateTourPackage(id, {
    status: "rejected",
    rejectedReason: reason,
  });
  await addAiCenterLog({
    type: "package_rejected",
    message: reason ?? `Rejected package: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "package",
  });
  return updated;
}

function toPublishedTourPackage(pkg: AiTourPackage): TourPackage {
  const category = (pkg.category as PackageCategory) || "domestic";
  return {
    id: `pub_${pkg.id}`,
    title: { en: pkg.title, hi: pkg.title },
    slug: pkg.seoMeta.slug,
    category,
    duration: pkg.duration,
    durationLabel: { en: pkg.durationLabel, hi: pkg.durationLabel },
    cities: [pkg.destination],
    hotels: [pkg.hotel.name],
    meals: pkg.meals,
    activities: pkg.activities,
    price: pkg.price,
    originalPrice: Math.round(pkg.price * 1.12),
    images: pkg.images,
    description: { en: pkg.overview, hi: pkg.overview },
    itinerary: pkg.itinerary.map((d) => ({
      day: d.day,
      title: { en: d.title, hi: d.title },
      description: { en: d.description, hi: d.description },
      activities: d.activities,
    })),
    inclusions: pkg.inclusions.map((x) => ({ en: x, hi: x })),
    exclusions: pkg.exclusions.map((x) => ({ en: x, hi: x })),
    rating: 4.7,
    reviewCount: 0,
    featured: false,
    publishStatus: "published",
    proposedBy: "ai_market_agent",
    approvedBy: pkg.approvedBy,
    approvedAt: pkg.approvedAt,
    createdAt: pkg.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export async function publishTourPackage(
  id: string,
  approvedBy: string
): Promise<AiTourPackage> {
  const settings = getAiCenterSettings();
  const pkg = getTourPackageById(id);
  if (!pkg) throw new Error("Package not found");
  if (settings.packageApprovalRequired && pkg.status !== "approved") {
    throw new Error("Package must be approved before publishing");
  }

  const published = toPublishedTourPackage(pkg);
  await upsertPackageInStore(published);

  const updated = await updateTourPackage(id, {
    status: "published",
    publishedAt: new Date().toISOString(),
    approvedBy: pkg.approvedBy ?? approvedBy,
    publishedPackageId: published.id,
  });

  await addAiCenterLog({
    type: "package_published",
    message: `Published package: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "package",
  });
  return updated;
}

export async function deleteTourPackage(id: string): Promise<void> {
  const pkg = getTourPackageById(id);
  packageCache = packageCache.filter((p) => p.id !== id);
  await deleteDoc(id);
  if (pkg) {
    await addAiCenterLog({
      type: "package_deleted",
      message: `Deleted package: ${pkg.title}`,
      resourceId: id,
      resourceType: "package",
    });
  }
}

export function getTourPackageStats() {
  return {
    total: packageCache.length,
    draft: packageCache.filter((p) => p.status === "draft").length,
    pending: packageCache.filter((p) => p.status === "pending_approval").length,
    approved: packageCache.filter((p) => p.status === "approved").length,
    published: packageCache.filter((p) => p.status === "published").length,
    rejected: packageCache.filter((p) => p.status === "rejected").length,
  };
}
