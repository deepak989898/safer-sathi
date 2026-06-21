import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { SITE_CONTACT } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Privacy Policy | Safar Sathi",
  description: "How Safar Sathi collects, uses, and protects your personal data when you book tours, hotels, and vehicles.",
  path: "/privacy",
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        subtitle="Last updated: June 2026"
        image={HERO_IMAGES.privacy}
      />
      <section className="container mx-auto max-w-3xl px-4 py-10 prose prose-slate dark:prose-invert">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly, including name, email, phone number,
          travel preferences, and payment details necessary to process bookings.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          Your information is used to process bookings, send confirmations, provide customer
          support, improve our AI recommendations, and send relevant travel updates with
          your consent.
        </p>

        <h2>3. AI & Personalization</h2>
        <p>
          Our Assistant may analyze your queries and booking history to provide
          personalized travel recommendations. You can opt out of AI personalization in
          your account settings.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We share necessary booking information with hotels, transport providers, and
          payment processors. We do not sell your personal data to third parties.
        </p>

        <h2>5. Data Security</h2>
        <p>
          We implement industry-standard security measures including encryption, secure
          servers, and regular security audits to protect your data.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use cookies to improve site functionality, remember preferences, and analyze
          usage patterns. You can manage cookie preferences in your browser settings.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. Contact{" "}
          {SITE_CONTACT.email} to exercise these rights.
        </p>
      </section>
    </>
  );
}
