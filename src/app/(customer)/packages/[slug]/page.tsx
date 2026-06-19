import { notFound } from "next/navigation";
import {
  getAllPackageSlugs,
  getPackageBySlug,
  getPackages,
} from "@/lib/catalog-service";
import { PackageDetailClient } from "./package-detail-client";

export async function generateStaticParams() {
  const slugs = await getAllPackageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

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

  return <PackageDetailClient pkg={pkg} relatedPackages={relatedPackages} />;
}
