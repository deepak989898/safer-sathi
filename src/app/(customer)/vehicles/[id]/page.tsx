import { notFound } from "next/navigation";
import { getVehicleById } from "@/lib/data-service";
import { VehicleDetailClient } from "./vehicle-detail-client";

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
