import { getHotels } from "@/lib/data-service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import HotelsClient from "./hotels-client";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Hotels in India | Book Stays | Safar Sathi",
  description:
    "Find and book hotels across India — budget to luxury stays in Manali, Goa, Delhi, Jaipur and more.",
  path: "/hotels",
  keywords: ["hotels India", "hotel booking", "budget hotels Goa", "Manali hotels"],
});

export default async function HotelsPage() {
  const hotels = await getHotels();
  return <HotelsClient initialHotels={hotels} />;
}
