import {
  addPackageDraft,
  getAdminPackages,
  upsertPackageInStore,
} from "@/lib/package-store";
import { publishHotel } from "@/lib/hotel-store";
import { publishVehicle } from "@/lib/vehicle-store";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { Hotel, HotelRoom } from "@/types";
import type {
  AICompetitorData,
  AIGeneratedImage,
  AIHotelDraft,
  AIPackageDraft,
  AITravelManagerStats,
  AIVehicleDraft,
  AIApprovalStatus,
} from "./types";

const AI_COLLECTIONS = {
  competitors: "ai_competitor_data",
  packageDrafts: "ai_package_drafts",
  vehicleDrafts: "ai_vehicle_drafts",
  hotelDrafts: "ai_hotel_drafts",
  images: "ai_generated_images",
} as const;

let competitors: AICompetitorData[] = [];
let packageDrafts: AIPackageDraft[] = [];
let vehicleDrafts: AIVehicleDraft[] = [];
let hotelDrafts: AIHotelDraft[] = [];
let generatedImages: AIGeneratedImage[] = [];
let aiUsageCounter = 0;

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function persistCollection<T extends { id: string }>(
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

async function loadCollection<T extends { id: string; createdAt?: string }>(
  collection: string
): Promise<T[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection(collection).limit(200).get();
    return snap.docs
      .map((d) => d.data() as T)
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      );
  } catch (error) {
    console.warn(`Firebase load ${collection} failed:`, error);
    return [];
  }
}

function mergeById<T extends { id: string; createdAt?: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of [...existing, ...incoming]) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );
}

export async function hydrateAITravelManagerStore(): Promise<void> {
  try {
    const [c, p, v, h] = await Promise.all([
      loadCollection<AICompetitorData>(AI_COLLECTIONS.competitors),
      loadCollection<AIPackageDraft>(AI_COLLECTIONS.packageDrafts),
      loadCollection<AIVehicleDraft>(AI_COLLECTIONS.vehicleDrafts),
      loadCollection<AIHotelDraft>(AI_COLLECTIONS.hotelDrafts),
    ]);
    competitors = mergeById(competitors, c);
    packageDrafts = mergeById(packageDrafts, p);
    vehicleDrafts = mergeById(vehicleDrafts, v);
    hotelDrafts = mergeById(hotelDrafts, h);
  } catch (error) {
    console.warn("AI Travel Manager hydrate failed, using in-memory store:", error);
  }
}

function mapApprovalToPublishStatus(
  status: AIApprovalStatus
): "draft" | "pending_approval" | "published" | "rejected" {
  if (status === "published") return "published";
  if (status === "pending_approval" || status === "manager_review") {
    return "pending_approval";
  }
  if (status === "rejected") return "rejected";
  return "draft";
}

function syncPackageDraftToAdminStore(draft: AIPackageDraft): void {
  upsertPackageInStore({
    ...draft,
    publishStatus: mapApprovalToPublishStatus(draft.approvalStatus),
    proposedBy: "ai_market_agent",
  });
}

export function trackAIUsage(): void {
  aiUsageCounter += 1;
}

// --- Competitors ---
export async function saveCompetitorData(
  data: AICompetitorData
): Promise<AICompetitorData> {
  competitors = [data, ...competitors.filter((c) => c.id !== data.id)];
  await persistCollection(AI_COLLECTIONS.competitors, data);
  trackAIUsage();
  return data;
}

export function listCompetitorData(): AICompetitorData[] {
  return [...competitors];
}

export function getCompetitorById(id: string): AICompetitorData | null {
  return competitors.find((c) => c.id === id) ?? null;
}

// --- Package drafts ---
export async function savePackageDraft(draft: AIPackageDraft): Promise<AIPackageDraft> {
  packageDrafts = [draft, ...packageDrafts.filter((p) => p.id !== draft.id)];
  syncPackageDraftToAdminStore(draft);
  await persistCollection(AI_COLLECTIONS.packageDrafts, draft);
  trackAIUsage();
  return draft;
}

export function listPackageDrafts(status?: AIApprovalStatus): AIPackageDraft[] {
  const fromStore = getAdminPackages().filter(
    (p) => p.proposedBy === "ai_market_agent" && p.publishStatus !== "published"
  ) as AIPackageDraft[];

  const merged = mergeById(
    packageDrafts,
    fromStore.map((p) => ({
      ...p,
      approvalStatus:
        p.publishStatus === "pending_approval"
          ? ("pending_approval" as const)
          : p.publishStatus === "rejected"
            ? ("rejected" as const)
            : ("draft" as const),
      seoSlug: p.slug,
      termsAndConditions: { en: "", hi: "" },
      cancellationPolicy: { en: "", hi: "" },
      faqs: [],
      tourHighlights: [],
      bestSeason: { en: "", hi: "" },
      tags: [],
    }))
  );

  if (!status) return merged;
  return merged.filter((p) => p.approvalStatus === status);
}

export function getPackageDraftById(id: string): AIPackageDraft | null {
  return packageDrafts.find((p) => p.id === id) ?? null;
}

export async function updatePackageDraft(
  id: string,
  updates: Partial<AIPackageDraft>
): Promise<AIPackageDraft | null> {
  const existing = getPackageDraftById(id);
  if (!existing) return null;
  const updated: AIPackageDraft = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };
  return savePackageDraft(updated);
}

export async function publishPackageDraft(
  id: string,
  approvedBy: string
): Promise<AIPackageDraft | null> {
  const draft = getPackageDraftById(id);
  if (!draft) return null;

  const published: AIPackageDraft = {
    ...draft,
    approvalStatus: "published",
    publishStatus: "published",
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  addPackageDraft({
    ...published,
    publishStatus: "published",
    proposedBy: "ai_market_agent",
  });

  return savePackageDraft(published);
}

// --- Vehicle drafts ---
export async function saveVehicleDraft(draft: AIVehicleDraft): Promise<AIVehicleDraft> {
  vehicleDrafts = [draft, ...vehicleDrafts.filter((v) => v.id !== draft.id)];
  await persistCollection(AI_COLLECTIONS.vehicleDrafts, draft);
  trackAIUsage();
  return draft;
}

export function listVehicleDrafts(status?: AIApprovalStatus): AIVehicleDraft[] {
  if (!status) return [...vehicleDrafts];
  return vehicleDrafts.filter((v) => v.approvalStatus === status);
}

export function getVehicleDraftById(id: string): AIVehicleDraft | null {
  return vehicleDrafts.find((v) => v.id === id) ?? null;
}

export async function updateVehicleDraft(
  id: string,
  updates: Partial<AIVehicleDraft>
): Promise<AIVehicleDraft | null> {
  const existing = getVehicleDraftById(id);
  if (!existing) return null;
  return saveVehicleDraft({
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
}

export async function publishVehicleDraft(
  id: string,
  approvedBy: string
): Promise<AIVehicleDraft | null> {
  const draft = getVehicleDraftById(id);
  if (!draft) return null;

  publishVehicle({
    id: draft.id.replace("ai_veh_", "veh_"),
    name: draft.name,
    type: draft.type,
    seats: draft.seats,
    pricePerDay: draft.pricePerDay,
    pricePerKm: draft.pricePerKm,
    images: draft.images,
    available: true,
    fuelType: draft.fuelType,
    driverIncluded: draft.driverIncluded,
    description: draft.description,
    features: draft.features,
    rating: draft.rating,
    reviewCount: draft.reviewCount,
    location: draft.location,
    createdAt: draft.createdAt,
    updatedAt: new Date().toISOString(),
  });

  return saveVehicleDraft({
    ...draft,
    approvalStatus: "published",
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// --- Hotel drafts ---
export async function saveHotelDraft(draft: AIHotelDraft): Promise<AIHotelDraft> {
  hotelDrafts = [draft, ...hotelDrafts.filter((h) => h.id !== draft.id)];
  await persistCollection(AI_COLLECTIONS.hotelDrafts, draft);
  trackAIUsage();
  return draft;
}

export function listHotelDrafts(status?: AIApprovalStatus): AIHotelDraft[] {
  if (!status) return [...hotelDrafts];
  return hotelDrafts.filter((h) => h.approvalStatus === status);
}

export function getHotelDraftById(draftId: string): AIHotelDraft | null {
  return hotelDrafts.find((h) => h.id === draftId) ?? null;
}

export async function updateHotelDraft(
  draftId: string,
  updates: Partial<AIHotelDraft>
): Promise<AIHotelDraft | null> {
  const existing = getHotelDraftById(draftId);
  if (!existing) return null;
  return saveHotelDraft({
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });
}

export async function publishHotelDraft(
  id: string,
  approvedBy: string
): Promise<AIHotelDraft | null> {
  const draft = getHotelDraftById(id);
  if (!draft) return null;

  const rooms: HotelRoom[] = draft.rooms.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    pricePerNight: r.pricePerNight,
    maxGuests: r.maxGuests,
    available: true,
    amenities: r.amenities,
    images: draft.images.slice(0, 1),
  }));

  const hotel: Hotel = {
    id: draft.id.replace("ai_hotel_", "hotel_"),
    name: draft.name,
    slug: draft.slug,
    starRating: draft.starRating,
    location: draft.location,
    city: draft.city,
    images: draft.images,
    amenities: draft.amenities,
    description: draft.description,
    priceFrom: draft.priceFrom,
    rooms,
    rating: 4.5,
    reviewCount: 0,
    available: true,
    createdAt: draft.createdAt,
    updatedAt: new Date().toISOString(),
  };

  publishHotel(hotel);

  return saveHotelDraft({
    ...draft,
    approvalStatus: "published",
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// --- Images ---
export async function saveGeneratedImage(image: AIGeneratedImage): Promise<AIGeneratedImage> {
  generatedImages = [image, ...generatedImages];
  await persistCollection(AI_COLLECTIONS.images, image);
  return image;
}

export function listGeneratedImages(relatedId?: string): AIGeneratedImage[] {
  if (!relatedId) return [...generatedImages];
  return generatedImages.filter((i) => i.relatedId === relatedId);
}

// --- Stats ---
export function getAITravelManagerStats(): AITravelManagerStats {
  const today = new Date().toISOString().slice(0, 10);
  const isToday = (d: string) => d.startsWith(today);

  return {
    packagesGeneratedToday: packageDrafts.filter((p) => isToday(p.createdAt)).length,
    competitorsAnalyzed: competitors.length,
    draftPackages: packageDrafts.filter((p) =>
      ["draft", "manager_review"].includes(p.approvalStatus)
    ).length,
    publishedPackages: packageDrafts.filter((p) => p.approvalStatus === "published").length,
    draftHotels: hotelDrafts.filter((h) => h.approvalStatus !== "published").length,
    draftVehicles: vehicleDrafts.filter((v) => v.approvalStatus !== "published").length,
    pendingApprovals: [
      ...packageDrafts,
    ].filter((p) => p.approvalStatus === "pending_approval").length +
      vehicleDrafts.filter((v) => v.approvalStatus === "pending_approval").length +
      hotelDrafts.filter((h) => h.approvalStatus === "pending_approval").length,
    aiUsageToday: aiUsageCounter,
    managerReviewQueue:
      packageDrafts.filter((p) => p.approvalStatus === "draft").length +
      vehicleDrafts.filter((v) => v.approvalStatus === "draft").length +
      hotelDrafts.filter((h) => h.approvalStatus === "draft").length,
  };
}

export { AI_COLLECTIONS };
