import { getVehicles } from "@/lib/data-service";
import AirportPickupClient from "./airport-pickup-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Airport Pickup & Drop | Safar Sathi",
  description:
    "Reliable airport transfer service in Delhi and major cities. Sedans, SUVs, and tempo traveller with fixed fares.",
  path: "/airport-pickup",
  keywords: ["airport pickup Delhi", "airport transfer India", "cab to airport", "Safar Sathi transfer"],
});

export const dynamic = "force-dynamic";

export default async function AirportPickupPage() {
  const vehicles = await getVehicles();
  const airportVehicles = vehicles.filter((v) =>
    ["car", "suv", "luxury"].includes(v.type)
  );
  return <AirportPickupClient vehicles={airportVehicles} />;
}
