import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import { demoHotels, demoVehicles } from "@/data/demo-data";
import type { Hotel, TourPackage, Vehicle } from "@/types";

export function getSeedPackages(): TourPackage[] {
  return getTourPackagesSeed();
}

export function getSeedVehicles(): Vehicle[] {
  return [...demoVehicles];
}

export function getSeedHotels(): Hotel[] {
  return [...demoHotels];
}
