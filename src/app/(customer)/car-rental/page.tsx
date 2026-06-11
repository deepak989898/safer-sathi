import { getVehicles } from "@/lib/data-service";
import CarRentalClient from "./car-rental-client";

export default async function CarRentalPage() {
  const vehicles = await getVehicles({ vehicleType: undefined });
  const cars = vehicles.filter((v) =>
    ["car", "suv", "luxury"].includes(v.type)
  );
  return <CarRentalClient initialVehicles={cars} />;
}
