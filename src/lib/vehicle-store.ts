import { demoVehicles } from "@/data/demo-data";
import type { Vehicle } from "@/types";

let vehiclesStore: Vehicle[] = [...demoVehicles];

export function getPublishedVehicles(): Vehicle[] {
  return [...vehiclesStore];
}

export function publishVehicle(vehicle: Vehicle): Vehicle {
  vehiclesStore = [vehicle, ...vehiclesStore.filter((v) => v.id !== vehicle.id)];
  return vehicle;
}

export function getVehicleByIdPublished(id: string): Vehicle | null {
  return vehiclesStore.find((v) => v.id === id) ?? null;
}

export function getAllPublishedVehicleIds(): string[] {
  return vehiclesStore.map((v) => v.id);
}
