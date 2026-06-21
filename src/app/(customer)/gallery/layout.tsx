import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HERO_IMAGES } from "@/lib/media/travel-images";

export const metadata: Metadata = buildPageMetadata({
  title: "Travel Gallery | Safar Sathi Destinations",
  description:
    "Explore photos from Manali, Goa, Rajasthan, Kerala, and more — inspiration for your next Safar Sathi journey.",
  path: "/gallery",
  keywords: ["India travel photos", "destination gallery", "Manali images", "Goa travel gallery"],
  image: HERO_IMAGES.gallery,
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
