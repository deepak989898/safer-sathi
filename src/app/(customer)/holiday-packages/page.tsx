import { getPackages } from "@/lib/data-service";
import HolidayPackagesClient from "./holiday-packages-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Holiday Packages India | Safar Sathi",
  description:
    "Book family, honeymoon, and adventure holiday packages across India with hotels, sightseeing, and transport included.",
  path: "/holiday-packages",
  keywords: ["holiday packages India", "honeymoon package", "family tour package", "India vacation deals"],
});

export const dynamic = "force-dynamic";

export default async function HolidayPackagesPage() {
  const packages = await getPackages();
  const holiday = packages.filter((p) =>
    ["family", "honeymoon", "adventure"].includes(p.category)
  );
  return <HolidayPackagesClient initialPackages={holiday.length ? holiday : packages} />;
}
