import { notFound } from "next/navigation";
import {
  getAllPackageSlugs,
  getPackageBySlug,
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
  return <PackageDetailClient pkg={pkg} />;
}
