import { PageHero } from "@/components/customer/page-hero";
import { getReviews } from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import ReviewsClient from "./reviews-client";

export default async function ReviewsPage() {
  const reviews = await getReviews();
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
