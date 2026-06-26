import {
  deleteCatalogItem,
  loadCatalogCollection,
  persistCatalogItem,
  persistCatalogItemsBatch,
  readCatalogItem,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { isCatalogPublished } from "@/lib/catalog/publish";
import { isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { getSeedHotels } from "@/data/seed-catalog";
import { getHotelsSeed } from "@/data/hotels-seed";
import type { Hotel } from "@/types";

const HOTELS_COLLECTION = "hotels";
const LEGACY_DEMO_HOTEL_IDS = ["h1", "h2", "h3"];

let hotelsStore: Hotel[] = [];
let hydratePromise: Promise<void> | null = null;

function upsertInMemory(hotel: Hotel): Hotel {
  hotelsStore = [hotel, ...hotelsStore.filter((h) => h.id !== hotel.id)];
  return hotel;
}

export async function hydrateHotelsStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const seed = getSeedHotels();
    const remote = await loadCatalogCollection<Hotel>(HOTELS_COLLECTION);

    if (remote === null) {
      if (hotelsStore.length === 0) hotelsStore = seed;
      return;
    }

    if (remote.length > 0) {
      hotelsStore = remote;
      return;
    }

    if (!isAdminEnvConfigured()) {
      hotelsStore = seed;
      return;
    }

    try {
      hotelsStore = await seedCatalogIfEmpty(HOTELS_COLLECTION, seed);
    } catch (error) {
      console.warn("hydrateHotelsStore seed failed, using in-memory seed:", error);
      hotelsStore = seed;
    }
  })();

  return hydratePromise;
}

export function getPublishedHotels(): Hotel[] {
  return hotelsStore.filter(
    (h) => h.available && isCatalogPublished(h.publishStatus)
  );
}

export function getAdminHotels(): Hotel[] {
  return [...hotelsStore];
}

export function getHotelByIdAdmin(id: string): Hotel | null {
  return hotelsStore.find((h) => h.id === id) ?? null;
}

export function getHotelBySlugPublished(slug: string): Hotel | null {
  const hotel = hotelsStore.find((h) => h.slug === slug);
  if (!hotel?.available || !isCatalogPublished(hotel.publishStatus)) return null;
  return hotel;
}

export function getAllPublishedHotelSlugs(): string[] {
  return getPublishedHotels().map((h) => h.slug);
}

export async function upsertHotelInStore(hotel: Hotel): Promise<Hotel> {
  const saved = upsertInMemory({
    ...hotel,
    updatedAt: new Date().toISOString(),
  });
  await persistCatalogItem(HOTELS_COLLECTION, saved);
  return saved;
}

export async function updateHotelInStore(
  id: string,
  updates: Partial<Hotel>
): Promise<Hotel | null> {
  const existing = getHotelByIdAdmin(id);
  if (!existing) return null;

  const merged: Hotel = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  await persistCatalogItem(HOTELS_COLLECTION, merged);
  const fromDb = await readCatalogItem<Hotel>(HOTELS_COLLECTION, id);
  return upsertInMemory(fromDb ?? merged);
}

export async function deleteHotelFromStore(id: string): Promise<boolean> {
  const exists = getHotelByIdAdmin(id);
  if (!exists) return false;
  hotelsStore = hotelsStore.filter((h) => h.id !== id);
  await deleteCatalogItem(HOTELS_COLLECTION, id);
  return true;
}

export async function publishHotel(hotel: Hotel): Promise<Hotel> {
  return upsertHotelInStore({
    ...hotel,
    available: true,
    status: "active",
    publishStatus: "published",
  });
}

export function hotelSlugExists(slug: string): boolean {
  return hotelsStore.some((h) => h.slug === slug);
}

export async function addHotelDraft(hotel: Hotel): Promise<Hotel> {
  return upsertHotelInStore(hotel);
}

export async function approveHotelInStore(
  id: string,
  approvedBy: string
): Promise<Hotel | null> {
  return updateHotelInStore(id, {
    publishStatus: "published",
    available: true,
    status: "active",
    approvedBy,
    approvedAt: new Date().toISOString(),
    rejectionReason: undefined,
  });
}

export async function rejectHotelInStore(
  id: string,
  reason?: string
): Promise<Hotel | null> {
  return updateHotelInStore(id, {
    publishStatus: "rejected",
    available: false,
    status: "inactive",
    rejectionReason: reason,
  });
}

export function resetHotelsStore(): void {
  hotelsStore = [];
  hydratePromise = null;
}

export async function reloadHotelsStore(): Promise<void> {
  resetHotelsStore();
  await hydrateHotelsStore();
}

/** Upsert all 60 professional hotels into Firestore (admin seed action). */
export async function seedHotels(): Promise<Hotel[]> {
  const hotels = getHotelsSeed();
  await persistCatalogItemsBatch(HOTELS_COLLECTION, hotels);
  await reloadHotelsStore();

  for (const id of LEGACY_DEMO_HOTEL_IDS) {
    const existing = getHotelByIdAdmin(id);
    if (existing?.available) {
      await upsertHotelInStore({ ...existing, available: false, status: "inactive" });
    }
  }

  return getAdminHotels();
}
