import { getHotelsSeed } from "@/data/hotels-seed";
import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import { getVehiclesSeed } from "@/data/vehicles-seed";
import type { Hotel, TourPackage, Vehicle } from "@/types";

export function getSeedPackages(): TourPackage[] {
  return getTourPackagesSeed();
}

export function getSeedVehicles(): Vehicle[] {
  return getVehiclesSeed();
}

export function getSeedHotels(): Hotel[] {
  return getHotelsSeed();
}
