import { notFound } from "next/navigation";
import { getHotelBySlug } from "@/lib/data-service";
import { HotelDetailClient } from "./hotel-detail-client";

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound();
  return <HotelDetailClient hotel={hotel} />;
}
