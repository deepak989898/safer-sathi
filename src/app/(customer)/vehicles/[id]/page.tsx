import { notFound } from "next/navigation";
import {
  getAllVehicleIds,
  getVehicleById,
} from "@/lib/catalog-service";
import { VehicleDetailClient } from "./vehicle-detail-client";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const ids = await getAllVehicleIds();
  return ids.map((id) => ({ id }));
}

export const dynamicParams = true;

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();
  return <VehicleDetailClient vehicle={vehicle} />;
}
