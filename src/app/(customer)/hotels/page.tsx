import { getHotels } from "@/lib/data-service";
import HotelsClient from "./hotels-client";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  const hotels = await getHotels();
  return <HotelsClient initialHotels={hotels} />;
}
