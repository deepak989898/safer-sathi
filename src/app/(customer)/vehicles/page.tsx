import { getVehicles } from "@/lib/data-service";
import VehiclesClient from "./vehicles-client";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const vehicles = await getVehicles();
  return <VehiclesClient initialVehicles={vehicles} />;
}
