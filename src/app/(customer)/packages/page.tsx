import { getPackages } from "@/lib/data-service";
import PackagesClient from "./packages-client";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const packages = await getPackages();
  return <PackagesClient initialPackages={packages} />;
}
