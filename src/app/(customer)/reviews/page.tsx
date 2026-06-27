import { PageHero } from "@/components/customer/page-hero";
import { getReviews } from "@/lib/data-service";
import { getSiteWideFallbackReviews } from "@/lib/catalog/catalog-reviews";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import ReviewsClient from "./reviews-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Customer Reviews | Safar Sathi",
  description:
    "Read verified Safar Sathi reviews from travelers who booked tour packages, hotels, and vehicles across India.",
  path: "/reviews",
  keywords: ["Safar Sathi reviews", "travel agency ratings", "India tour reviews", "customer testimonials"],
  image: HERO_IMAGES.reviews,
});

export default async function ReviewsPage() {
  const liveReviews = await getReviews();
  const reviews = liveReviews.length > 0 ? liveReviews : getSiteWideFallbackReviews(24);
  return (
    <>
      <PageHero
        title="Customer Reviews"
        subtitle="Real experiences from travelers who chose Safar Sathi"
        image={HERO_IMAGES.reviews}
      />
      <ReviewsClient reviews={reviews} />
    </>
  );
}
