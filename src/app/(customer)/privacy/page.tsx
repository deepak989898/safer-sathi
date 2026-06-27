import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { LegalSections } from "@/lib/legal/legal-sections";
import { PRIVACY_LAST_UPDATED, privacySections } from "@/lib/legal/privacy-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Privacy Policy | Safar Sathi",
  description:
    "How Safar Sathi collects, uses, stores, and protects your personal data when you book tours, hotels, vehicles, and use our AI travel assistant.",
  path: "/privacy",
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        subtitle={`Last updated: ${PRIVACY_LAST_UPDATED}`}
        image={HERO_IMAGES.privacy}
      />
      <section className="container mx-auto max-w-3xl px-4 py-10 prose prose-slate dark:prose-invert">
        <p className="lead not-prose text-muted-foreground">
          Your privacy matters to us. This policy explains how Safar Sathi handles your personal information when
          you use our website, make bookings, and interact with our travel assistant.
        </p>
        <LegalSections sections={privacySections} />
      </section>
    </>
  );
}
