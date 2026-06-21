import { getVehicles } from "@/lib/data-service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import VehiclesClient from "./vehicles-client";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Vehicle Rental India | Innova, Tempo Traveller | Safar Sathi",
  description:
    "Rent cars, Innova Crysta, SUVs and tempo travellers with driver across India. Per day and per km pricing.",
  path: "/vehicles",
  keywords: ["car rental India", "Innova rental", "tempo traveller", "vehicle hire"],
});

export default async function VehiclesPage() {
  const vehicles = await getVehicles();
  return <VehiclesClient initialVehicles={vehicles} />;
}
