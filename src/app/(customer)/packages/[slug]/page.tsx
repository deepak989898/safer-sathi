import { notFound } from "next/navigation";
import { getPackageBySlug } from "@/lib/data-service";
import { PackageDetailClient } from "./package-detail-client";

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
