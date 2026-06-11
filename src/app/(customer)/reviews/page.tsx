import { PageHero } from "@/components/customer/page-hero";
import { getReviews } from "@/lib/data-service";
import ReviewsClient from "./reviews-client";

export default async function ReviewsPage() {
  const reviews = await getReviews();
  return (
    <>
      <PageHero
        title="Customer Reviews"
        subtitle="Real experiences from travelers who chose Safar Sathi"
      />
      <ReviewsClient reviews={reviews} />
    </>
  );
}
