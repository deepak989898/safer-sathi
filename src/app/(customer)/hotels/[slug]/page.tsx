import { notFound } from "next/navigation";
import {
  getAllHotelSlugs,
  getHotelBySlug,
} from "@/lib/catalog-service";
import { HotelDetailClient } from "./hotel-detail-client";

export function generateStaticParams() {
  return getAllHotelSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = true;

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
