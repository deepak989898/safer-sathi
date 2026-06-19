import {
  demoHotels,
  demoPackages,
  demoVehicles,
} from "@/data/demo-data";
import type { Hotel, PackagePublishStatus, TourPackage, Vehicle } from "@/types";

export function getSeedPackages(): TourPackage[] {
  return demoPackages.map((pkg) => ({
    ...pkg,
    publishStatus: "published" as PackagePublishStatus,
    proposedBy: "admin" as const,
  }));
}

export function getSeedVehicles(): Vehicle[] {
  return [...demoVehicles];
}

export function getSeedHotels(): Hotel[] {
  return [...demoHotels];
}
