import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { LegalSections } from "@/lib/legal/legal-sections";
import { TERMS_LAST_UPDATED, termsSections } from "@/lib/legal/terms-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Terms of Service | Safar Sathi",
  description:
    "Terms and conditions for booking tour packages, hotels, vehicles, and travel services with Safar Sathi, including payments, cancellations, and user responsibilities.",
  path: "/terms",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <>
      <PageHero
        title="Terms of Service"
        subtitle={`Last updated: ${TERMS_LAST_UPDATED}`}
        image={HERO_IMAGES.terms}
      />
      <section className="container mx-auto max-w-3xl px-4 py-10 prose prose-slate dark:prose-invert">
        <p className="lead not-prose text-muted-foreground">
          Please read these terms carefully before using Safar Sathi or confirming any booking. They explain your
          rights and responsibilities as a customer.
        </p>
        <LegalSections sections={termsSections} />
      </section>
    </>
  );
}
