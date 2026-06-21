import { getVehicles } from "@/lib/data-service";
import TempoTravellerClient from "./tempo-traveller-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Tempo Traveller Rental | Safar Sathi",
  description:
    "Book 12–17 seater tempo traveller for group tours, pilgrimages, and outstation trips across India.",
  path: "/tempo-traveller",
  keywords: ["tempo traveller rental", "group tour vehicle", "12 seater tempo", "India group travel"],
});

export const dynamic = "force-dynamic";

export default async function TempoTravellerPage() {
  const vehicles = await getVehicles({ vehicleType: "tempo_traveller" });
  return <TempoTravellerClient initialVehicles={vehicles} />;
}
