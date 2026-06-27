import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { getEntityReviews } from "@/lib/catalog/entity-reviews-service";
import {
  getHotelById,
  getPackageById,
  getVehicleById,
} from "@/lib/catalog-service";
import { localizedText } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/types";
import EntityReviewsClient from "./entity-reviews-client";

const VALID_TYPES = new Set<ServiceType>(["package", "hotel", "vehicle"]);

interface PageProps {
  params: Promise<{ serviceType: string; serviceId: string }>;
}

async function resolveEntity(serviceType: ServiceType, serviceId: string) {
  const decodedId = decodeURIComponent(serviceId);

  if (serviceType === "vehicle") {
    const vehicle = await getVehicleById(decodedId);
    if (!vehicle) return null;
    return {
      name: localizedText(vehicle.name, "en"),
      rating: vehicle.rating,
      reviewCount: vehicle.reviewCount,
      backHref: `/vehicles/${vehicle.id}`,
      backLabel: "Back to vehicle",
    };
  }

  if (serviceType === "hotel") {
    const hotel = await getHotelById(decodedId);
    if (!hotel) return null;
    return {
      name: localizedText(hotel.name, "en"),
      rating: hotel.rating,
      reviewCount: hotel.reviewCount,
      backHref: `/hotels/${hotel.slug}`,
      backLabel: "Back to hotel",
    };
  }

  const pkg = await getPackageById(decodedId);
  if (!pkg) return null;
  return {
    name: localizedText(pkg.title, "en"),
    rating: pkg.rating,
    reviewCount: pkg.reviewCount,
    backHref: `/packages/${pkg.slug}`,
    backLabel: "Back to package",
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { serviceType, serviceId } = await params;
  if (!VALID_TYPES.has(serviceType as ServiceType)) {
    return buildPageMetadata({
      title: "Reviews | Safar Sathi",
      description: "Customer reviews on Safar Sathi.",
      path: "/reviews",
    });
  }

  const entity = await resolveEntity(serviceType as ServiceType, serviceId);
  if (!entity) {
    return buildPageMetadata({
      title: "Reviews | Safar Sathi",
      description: "Customer reviews on Safar Sathi.",
      path: "/reviews",
    });
  }

  return buildPageMetadata({
    title: `${entity.name} Reviews (${entity.rating.toFixed(1)}★) | Safar Sathi`,
    description: `Read ${entity.reviewCount} verified customer reviews for ${entity.name} on Safar Sathi.`,
    path: `/reviews/${serviceType}/${serviceId}`,
    keywords: [`${entity.name} reviews`, "Safar Sathi ratings", "travel reviews India"],
    image: HERO_IMAGES.reviews,
  });
}

export default async function EntityReviewsPage({ params }: PageProps) {
  const { serviceType, serviceId } = await params;

  if (!VALID_TYPES.has(serviceType as ServiceType)) {
    notFound();
  }

  const typedServiceType = serviceType as ServiceType;
  const entity = await resolveEntity(typedServiceType, serviceId);
  if (!entity) notFound();

  const reviews = await getEntityReviews({
    serviceType: typedServiceType,
    serviceId: decodeURIComponent(serviceId),
    entityName: entity.name,
    rating: entity.rating,
    reviewCount: entity.reviewCount,
  });

  return (
    <>
      <PageHero
        title={`${entity.name} Reviews`}
        subtitle={`${entity.rating.toFixed(1)} rating from ${entity.reviewCount} verified travelers`}
        image={HERO_IMAGES.reviews}
      />
      <div className="container mx-auto px-4 pt-6">
        <Link
          href={entity.backHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex gap-1")}
        >
          <ChevronLeft className="h-4 w-4" />
          {entity.backLabel}
        </Link>
      </div>
      <EntityReviewsClient
        reviews={reviews}
        entityName={entity.name}
        rating={entity.rating}
        reviewCount={entity.reviewCount}
      />
    </>
  );
}
