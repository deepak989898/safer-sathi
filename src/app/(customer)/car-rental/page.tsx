import { getVehicles } from "@/lib/data-service";
import CarRentalClient from "./car-rental-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Car Rental India | Safar Sathi",
  description:
    "Rent sedans, SUVs, and luxury cars with driver across India. Transparent per-day pricing and instant booking.",
  path: "/car-rental",
  keywords: ["car rental India", "SUV rental Delhi", "Innova Crysta hire", "outstation car rental"],
});

export const dynamic = "force-dynamic";

export default async function CarRentalPage() {
  const vehicles = await getVehicles({ vehicleType: undefined });
  const cars = vehicles.filter((v) =>
    ["car", "suv", "luxury"].includes(v.type)
  );
  return <CarRentalClient initialVehicles={cars} />;
}
