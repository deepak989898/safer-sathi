import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const site = appUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/login", "/register", "/pending-approval", "/my-bookings", "/booking"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
