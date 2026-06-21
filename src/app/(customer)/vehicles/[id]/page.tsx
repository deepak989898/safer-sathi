import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllVehicleIds, getVehicleById } from "@/lib/catalog-service";
import { localizedText } from "@/lib/i18n";
import { buildPageMetadata, stripHtml } from "@/lib/seo/metadata";
import { breadcrumbSchema, vehicleRentalSchema } from "@/lib/seo/schema";
import { appUrl } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/json-ld";
import { VehicleDetailClient } from "./vehicle-detail-client";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const ids = await getAllVehicleIds();
  return ids.map((id) => ({ id }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: "Vehicle Not Found | Safar Sathi" };

  const name = localizedText(vehicle.name, "en");
  const description = stripHtml(localizedText(vehicle.description, "en")).slice(0, 155);

  return buildPageMetadata({
    title: `${name} Rental | Safar Sathi`,
    description:
      description ||
      `Rent ${name} with driver. ${vehicle.seats} seats · ₹${vehicle.pricePerDay}/day · ₹${vehicle.pricePerKm ?? "—"}/km across India.`,
    path: `/vehicles/${id}`,
    image: vehicle.images[0],
    keywords: [
      `${name.toLowerCase()} rental`,
      "car rental India",
      "innova rental",
      "tempo traveller hire",
      `${vehicle.seats} seater vehicle`,
      "Safar Sathi",
    ],
  });
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const name = localizedText(vehicle.name, "en");
  const description = stripHtml(localizedText(vehicle.description, "en"));
  const pageUrl = appUrl(`/vehicles/${id}`);

  return (
    <>
      <JsonLd
        data={[
          vehicleRentalSchema({
            name,
            description,
            url: pageUrl,
            image: vehicle.images[0],
            pricePerDay: vehicle.pricePerDay,
            seats: vehicle.seats,
            brand: vehicle.brand,
          }),
          breadcrumbSchema([
            { name: "Home", url: appUrl() },
            { name: "Vehicles", url: appUrl("/vehicles") },
            { name, url: pageUrl },
          ]),
        ]}
      />
      <VehicleDetailClient vehicle={vehicle} />
    </>
  );
}
