import type { MetadataRoute } from "next";
import {
  getAllBlogSlugs,
  getAllHotelSlugs,
  getAllPackageSlugs,
  getAllVehicleIds,
} from "@/lib/catalog-service";
import { appUrl } from "@/lib/site-config";
import { STATIC_SEO_PAGES } from "@/lib/seo/pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [packageSlugs, hotelSlugs, vehicleIds, blogSlugs] = await Promise.all([
    getAllPackageSlugs(),
    getAllHotelSlugs(),
    getAllVehicleIds(),
    getAllBlogSlugs(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_SEO_PAGES.map((page) => ({
    url: appUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const packageEntries: MetadataRoute.Sitemap = packageSlugs.map((slug) => ({
    url: appUrl(`/packages/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const hotelEntries: MetadataRoute.Sitemap = hotelSlugs.map((slug) => ({
    url: appUrl(`/hotels/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const vehicleEntries: MetadataRoute.Sitemap = vehicleIds.map((id) => ({
    url: appUrl(`/vehicles/${id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: appUrl(`/blog/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [
    ...staticEntries,
    ...packageEntries,
    ...hotelEntries,
    ...vehicleEntries,
    ...blogEntries,
  ];
}
