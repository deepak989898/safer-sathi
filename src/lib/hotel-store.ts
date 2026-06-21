import {
  deleteCatalogItem,
  loadCatalogCollection,
  persistCatalogItem,
  persistCatalogItemsBatch,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { mergeCatalogById } from "@/lib/catalog/merge-catalog";
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
    if (remote.length === 0) {
      hotelsStore = await seedCatalogIfEmpty(HOTELS_COLLECTION, seed);
    } else {
      hotelsStore = mergeCatalogById(remote, seed);
    }
  })();

  return hydratePromise;
}

export function getPublishedHotels(): Hotel[] {
  return hotelsStore.filter((h) => h.available);
}

export function getAdminHotels(): Hotel[] {
  return [...hotelsStore];
}

export function getHotelByIdAdmin(id: string): Hotel | null {
  return hotelsStore.find((h) => h.id === id) ?? null;
}

export function getHotelBySlugPublished(slug: string): Hotel | null {
  return hotelsStore.find((h) => h.slug === slug && h.available) ?? null;
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
  return upsertHotelInStore({
    ...existing,
    ...updates,
    id: existing.id,
  });
}

export async function deleteHotelFromStore(id: string): Promise<boolean> {
  const exists = getHotelByIdAdmin(id);
  if (!exists) return false;
  hotelsStore = hotelsStore.filter((h) => h.id !== id);
  await deleteCatalogItem(HOTELS_COLLECTION, id);
  return true;
}

export async function publishHotel(hotel: Hotel): Promise<Hotel> {
  return upsertHotelInStore({ ...hotel, available: true });
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
