import { getVehicles } from "@/lib/data-service";
import CarRentalClient from "./car-rental-client";

export const dynamic = "force-dynamic";

export default async function CarRentalPage() {
  const vehicles = await getVehicles({ vehicleType: undefined });
  const cars = vehicles.filter((v) =>
    ["car", "suv", "luxury"].includes(v.type)
  );
  return <CarRentalClient initialVehicles={cars} />;
}
