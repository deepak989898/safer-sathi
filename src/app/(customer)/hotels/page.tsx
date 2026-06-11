import { getHotels } from "@/lib/data-service";
import HotelsClient from "./hotels-client";

export default async function HotelsPage() {
  const hotels = await getHotels();
  return <HotelsClient initialHotels={hotels} />;
}
