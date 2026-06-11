import { getPackages } from "@/lib/data-service";
import HolidayPackagesClient from "./holiday-packages-client";

export default async function HolidayPackagesPage() {
  const packages = await getPackages();
  const holiday = packages.filter((p) =>
    ["family", "honeymoon", "adventure"].includes(p.category)
  );
  return <HolidayPackagesClient initialPackages={holiday.length ? holiday : packages} />;
}
