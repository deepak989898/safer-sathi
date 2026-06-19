import { getVehicles } from "@/lib/data-service";
import TempoTravellerClient from "./tempo-traveller-client";

export const dynamic = "force-dynamic";

export default async function TempoTravellerPage() {
  const vehicles = await getVehicles({ vehicleType: "tempo_traveller" });
  return <TempoTravellerClient initialVehicles={vehicles} />;
}
