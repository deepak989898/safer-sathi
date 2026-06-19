import {
  deleteCatalogItem,
  persistCatalogItem,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { getSeedVehicles } from "@/data/seed-catalog";
import { getVehiclesSeed } from "@/data/vehicles-seed";
import type { Vehicle } from "@/types";

const VEHICLES_COLLECTION = "vehicles";

let vehiclesStore: Vehicle[] = [];
let hydratePromise: Promise<void> | null = null;

function upsertInMemory(vehicle: Vehicle): Vehicle {
  vehiclesStore = [vehicle, ...vehiclesStore.filter((v) => v.id !== vehicle.id)];
  return vehicle;
}

export async function hydrateVehiclesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const items = await seedCatalogIfEmpty(VEHICLES_COLLECTION, getSeedVehicles());
    vehiclesStore = items;
  })();

  return hydratePromise;
}

export function getPublishedVehicles(): Vehicle[] {
  return vehiclesStore.filter((v) => v.available);
}

export function getAdminVehicles(): Vehicle[] {
  return [...vehiclesStore];
}

export function getVehicleByIdAdmin(id: string): Vehicle | null {
  return vehiclesStore.find((v) => v.id === id) ?? null;
}

export function getVehicleByIdPublished(id: string): Vehicle | null {
  const vehicle = vehiclesStore.find((v) => v.id === id);
  return vehicle?.available ? vehicle : null;
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
  return upsertVehicleInStore({ ...vehicle, available: true });
}

export function resetVehiclesStore(): void {
  vehiclesStore = [];
  hydratePromise = null;
}

/** Upsert all 30 professional vehicles into Firestore (admin seed action). */
export async function seedVehicles(): Promise<Vehicle[]> {
  await hydrateVehiclesStore();
  const vehicles = getVehiclesSeed();
  const saved: Vehicle[] = [];
  for (const vehicle of vehicles) {
    saved.push(await upsertVehicleInStore(vehicle));
  }
  return saved;
}
