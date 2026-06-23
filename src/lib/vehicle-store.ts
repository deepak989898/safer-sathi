import {
  deleteCatalogItem,
  loadCatalogCollection,
  persistCatalogItem,
  persistCatalogItemsBatch,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { mergeCatalogById } from "@/lib/catalog/merge-catalog";
import { isCatalogPublished } from "@/lib/catalog/publish";
import { getSeedVehicles } from "@/data/seed-catalog";
import { getVehiclesSeed } from "@/data/vehicles-seed";
import type { Vehicle } from "@/types";

const VEHICLES_COLLECTION = "vehicles";
const LEGACY_DEMO_VEHICLE_IDS = ["v1", "v2", "v3", "v4", "v5", "v6"];

let vehiclesStore: Vehicle[] = [];
let hydratePromise: Promise<void> | null = null;

function upsertInMemory(vehicle: Vehicle): Vehicle {
  vehiclesStore = [vehicle, ...vehiclesStore.filter((v) => v.id !== vehicle.id)];
  return vehicle;
}

export async function hydrateVehiclesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const seed = getSeedVehicles();
    const remote = await loadCatalogCollection<Vehicle>(VEHICLES_COLLECTION);
    if (remote.length === 0) {
      vehiclesStore = await seedCatalogIfEmpty(VEHICLES_COLLECTION, seed);
    } else {
      vehiclesStore = mergeCatalogById(remote, seed);
    }
  })();

  return hydratePromise;
}

export function getPublishedVehicles(): Vehicle[] {
  return vehiclesStore.filter(
    (v) => v.available && isCatalogPublished(v.publishStatus)
  );
}

export function getAdminVehicles(): Vehicle[] {
  return [...vehiclesStore];
}

export function getVehicleByIdAdmin(id: string): Vehicle | null {
  return vehiclesStore.find((v) => v.id === id) ?? null;
}

export function getVehicleByIdPublished(id: string): Vehicle | null {
  const vehicle = vehiclesStore.find((v) => v.id === id);
  if (!vehicle?.available || !isCatalogPublished(vehicle.publishStatus)) return null;
  return vehicle;
}

export function getAllPublishedVehicleIds(): string[] {
  return getPublishedVehicles().map((v) => v.id);
}

export async function upsertVehicleInStore(vehicle: Vehicle): Promise<Vehicle> {
  const saved = upsertInMemory({
    ...vehicle,
    updatedAt: new Date().toISOString(),
  });
  await persistCatalogItem(VEHICLES_COLLECTION, saved);
  return saved;
}

export async function updateVehicleInStore(
  id: string,
  updates: Partial<Vehicle>
): Promise<Vehicle | null> {
  const existing = getVehicleByIdAdmin(id);
  if (!existing) return null;
  return upsertVehicleInStore({
    ...existing,
    ...updates,
    id: existing.id,
  });
}

export async function deleteVehicleFromStore(id: string): Promise<boolean> {
  const exists = getVehicleByIdAdmin(id);
  if (!exists) return false;
  vehiclesStore = vehiclesStore.filter((v) => v.id !== id);
  await deleteCatalogItem(VEHICLES_COLLECTION, id);
  return true;
}

export async function publishVehicle(vehicle: Vehicle): Promise<Vehicle> {
  return upsertVehicleInStore({
    ...vehicle,
    available: true,
    status: "active",
    publishStatus: "published",
  });
}

export async function addVehicleDraft(vehicle: Vehicle): Promise<Vehicle> {
  return upsertVehicleInStore(vehicle);
}

export async function approveVehicleInStore(
  id: string,
  approvedBy: string
): Promise<Vehicle | null> {
  return updateVehicleInStore(id, {
    publishStatus: "published",
    available: true,
    status: "active",
    approvedBy,
    approvedAt: new Date().toISOString(),
    rejectionReason: undefined,
  });
}

export async function rejectVehicleInStore(
  id: string,
  reason?: string
): Promise<Vehicle | null> {
  return updateVehicleInStore(id, {
    publishStatus: "rejected",
    available: false,
    status: "inactive",
    rejectionReason: reason,
  });
}

export function resetVehiclesStore(): void {
  vehiclesStore = [];
  hydratePromise = null;
}

export async function reloadVehiclesStore(): Promise<void> {
  resetVehiclesStore();
  await hydrateVehiclesStore();
}

/** Upsert all 30 professional vehicles into Firestore (admin seed action). */
export async function seedVehicles(): Promise<Vehicle[]> {
  const vehicles = getVehiclesSeed();
  await persistCatalogItemsBatch(VEHICLES_COLLECTION, vehicles);
  await reloadVehiclesStore();

  for (const id of LEGACY_DEMO_VEHICLE_IDS) {
    const existing = getVehicleByIdAdmin(id);
    if (existing?.available) {
      await upsertVehicleInStore({ ...existing, available: false, status: "inactive" });
    }
  }

  return getAdminVehicles();
}
