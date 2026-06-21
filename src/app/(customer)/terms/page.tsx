import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { SITE_CONTACT } from "@/lib/site-config";

export default function TermsPage() {
  return (
    <>
      <PageHero
        title="Terms of Service"
        subtitle="Last updated: June 2026"
        image={HERO_IMAGES.terms}
      />
      <section className="container mx-auto max-w-3xl px-4 py-10 prose prose-slate dark:prose-invert">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Safar Sathi&apos;s platform, you agree to be bound by these
          Terms of Service. If you do not agree, please do not use our services.
        </p>

        <h2>2. Booking & Reservations</h2>
        <p>
          All bookings are subject to availability and confirmation. Prices displayed are
          indicative and may change until payment is confirmed. Safar Sathi reserves the
          right to cancel bookings in case of unavailability or pricing errors.
        </p>

        <h2>3. Payment Terms</h2>
        <p>
          Full or partial payment may be required at the time of booking depending on the
          service type. All transactions are processed securely through authorized payment
          gateways.
        </p>

        <h2>4. Cancellation & Refunds</h2>
        <p>
          Cancellation policies vary by service provider and package type. Refunds, where
          applicable, will be processed within 7-10 business days to the original payment
          method.
        </p>

        <h2>5. User Responsibilities</h2>
        <p>
          Users are responsible for providing accurate personal and travel information.
          Safar Sathi is not liable for issues arising from incorrect information provided
          during booking.
        </p>

        <h2>6. Limitation of Liability</h2>
        <p>
          Safar Sathi acts as an intermediary between travelers and service providers. We
          are not liable for acts, errors, omissions, or conduct of third-party providers.
        </p>

        <h2>7. Contact</h2>
        <p>
          For questions about these terms, contact us at {SITE_CONTACT.email} or call{" "}
          {SITE_CONTACT.phone}.
        </p>
      </section>
    </>
  );
}
