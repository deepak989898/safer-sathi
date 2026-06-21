import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllPackageSlugs,
  getPackageBySlug,
  getPackages,
} from "@/lib/catalog-service";
import { localizedText } from "@/lib/i18n";
import { buildPageMetadata, stripHtml } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  touristTripSchema,
} from "@/lib/seo/schema";
import { appUrl } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/json-ld";
import { PackageDetailClient } from "./package-detail-client";

export async function generateStaticParams() {
  const slugs = await getAllPackageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) return { title: "Package Not Found | Safar Sathi" };

  const title = localizedText(pkg.title, "en");
  const description = stripHtml(localizedText(pkg.description, "en")).slice(0, 155);
  const cities = pkg.cities.join(", ");

  return buildPageMetadata({
    title: `${title} Tour Package | Safar Sathi`,
    description:
      description ||
      `Book ${title} from Delhi & major cities. ${pkg.duration} days · ${cities}. Hotels, vehicle & sightseeing included.`,
    path: `/packages/${slug}`,
    image: pkg.images[0],
    keywords: [
      title.toLowerCase(),
      `${title.toLowerCase()} tour package`,
      `${title.toLowerCase()} package from delhi`,
      ...pkg.cities.map((c) => `${c.toLowerCase()} tour`),
      "Safar Sathi",
    ],
  });
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const allPackages = await getPackages();
  const relatedPackages = allPackages
    .filter((p) => p.id !== pkg.id && p.category === pkg.category)
    .slice(0, 3);

  const title = localizedText(pkg.title, "en");
  const description = stripHtml(localizedText(pkg.description, "en"));
  const pageUrl = appUrl(`/packages/${slug}`);

  const schema = [
    touristTripSchema({
      name: title,
      description,
      url: pageUrl,
      image: pkg.images[0],
      price: pkg.price,
      durationDays: pkg.duration,
      destination: pkg.cities[0],
    }),
    breadcrumbSchema([
      { name: "Home", url: appUrl() },
      { name: "Tour Packages", url: appUrl("/packages") },
      { name: title, url: pageUrl },
    ]),
  ];

  return (
    <>
      <JsonLd data={schema} />
      <PackageDetailClient pkg={pkg} relatedPackages={relatedPackages} />
    </>
  );
}
