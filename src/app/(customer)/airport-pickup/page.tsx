import { getVehicles } from "@/lib/data-service";
import AirportPickupClient from "./airport-pickup-client";

export const dynamic = "force-dynamic";

export default async function AirportPickupPage() {
  const vehicles = await getVehicles();
  const airportVehicles = vehicles.filter((v) =>
    ["car", "suv", "luxury"].includes(v.type)
  );
  return <AirportPickupClient vehicles={airportVehicles} />;
}
