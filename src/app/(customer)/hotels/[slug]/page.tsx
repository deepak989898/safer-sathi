import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllHotelSlugs, getHotelBySlug, getHotels } from "@/lib/catalog-service";
import { getEffectiveHotelPriceFrom } from "@/lib/catalog/hotel-pricing";
import { localizedText } from "@/lib/i18n";
import { buildPageMetadata, stripHtml } from "@/lib/seo/metadata";
import { breadcrumbSchema, hotelSchema } from "@/lib/seo/schema";
import { appUrl } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/json-ld";
import { HotelDetailClient } from "./hotel-detail-client";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getAllHotelSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) return { title: "Hotel Not Found | Safar Sathi" };

  const name = localizedText(hotel.name, "en");
  const description = stripHtml(localizedText(hotel.description, "en")).slice(0, 155);
  const fromPrice = getEffectiveHotelPriceFrom(hotel);

  return buildPageMetadata({
    title: `${name} Hotel Booking | Safar Sathi`,
    description:
      description ||
      `Book ${name} in ${hotel.city}. ${hotel.starRating}★ hotel from ₹${fromPrice}/night with instant confirmation.`,
    path: `/hotels/${slug}`,
    image: hotel.images[0],
    keywords: [
      `${name.toLowerCase()} hotel`,
      `hotels in ${hotel.city.toLowerCase()}`,
      `${hotel.city.toLowerCase()} stay`,
      "hotel booking India",
      "Safar Sathi",
    ],
  });
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound();

  const allHotels = await getHotels();
  const sameCity = allHotels.filter(
    (h) => h.id !== hotel.id && h.city.toLowerCase() === hotel.city.toLowerCase()
  );
  const relatedHotels = [
    ...sameCity,
    ...allHotels.filter(
      (h) =>
        h.id !== hotel.id &&
        h.city.toLowerCase() !== hotel.city.toLowerCase() &&
        !sameCity.some((match) => match.id === h.id)
    ),
  ].slice(0, 3);

  const name = localizedText(hotel.name, "en");
  const description = stripHtml(localizedText(hotel.description, "en"));
  const pageUrl = appUrl(`/hotels/${slug}`);
  const fromPrice = getEffectiveHotelPriceFrom(hotel);

  return (
    <>
      <JsonLd
        data={[
          hotelSchema({
            name,
            description,
            url: pageUrl,
            image: hotel.images[0],
            priceFrom: fromPrice,
            starRating: hotel.starRating,
            city: hotel.city,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount,
          }),
          breadcrumbSchema([
            { name: "Home", url: appUrl() },
            { name: "Hotels", url: appUrl("/hotels") },
            { name, url: pageUrl },
          ]),
        ]}
      />
      <HotelDetailClient hotel={hotel} relatedHotels={relatedHotels} />
    </>
  );
}
