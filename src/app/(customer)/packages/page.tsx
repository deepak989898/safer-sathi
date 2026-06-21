import { getPackages } from "@/lib/data-service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import PackagesClient from "./packages-client";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Tour Packages in India | Safar Sathi",
  description:
    "Browse curated India tour packages — Manali, Goa, Kashmir, Rajasthan & more. Hotels, vehicles and sightseeing with instant booking.",
  path: "/packages",
  keywords: ["tour packages India", "holiday packages", "Manali package", "Goa tour"],
});

export default async function PackagesPage() {
  const packages = await getPackages();
  return <PackagesClient initialPackages={packages} />;
}
