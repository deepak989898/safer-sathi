import { SITE_CONTACT, SITE_NAME } from "@/lib/site-config";
import type { LegalSection } from "@/lib/legal/legal-sections";

export const TERMS_LAST_UPDATED = "June 2026";

export const termsSections: LegalSection[] = [
  {
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the {SITE_NAME} website,
          mobile experience, admin portal (where applicable), AI travel assistant, and all booking-related services
          (collectively, the &quot;Platform&quot;).
        </p>
        <p>
          By browsing, registering, or making a booking on our Platform, you agree to be bound by these Terms, our
          Privacy Policy, and any additional conditions displayed at checkout or on specific service pages. If you
          do not agree, please do not use our services.
        </p>
        <p>
          If you are booking on behalf of others, you confirm that you have authority to accept these Terms for all
          travelers included in the booking.
        </p>
      </>
    ),
  },
  {
    title: "2. About Our Services",
    content: (
      <>
        <p>
          {SITE_NAME} is a travel booking platform that helps customers discover and book tour packages, hotels,
          vehicles, tempo travellers, airport transfers, and related travel services across India.
        </p>
        <p>
          Unless explicitly stated otherwise, {SITE_NAME} acts as an <strong>intermediary</strong> or booking agent
          connecting you with independent hotels, transport operators, tour partners, and activity providers
          (&quot;Service Providers&quot;). The actual travel service is often delivered by these third parties under
          their own terms and operational standards.
        </p>
        <p>
          Descriptions, photos, itineraries, and AI-generated suggestions on our Platform are for informational
          purposes. Final confirmed details will be communicated in your booking voucher or confirmation email.
        </p>
      </>
    ),
  },
  {
    title: "3. Eligibility & Account Registration",
    content: (
      <>
        <p>To use our booking services, you must:</p>
        <ul>
          <li>Be at least 18 years of age, or book through a parent or legal guardian.</li>
          <li>Provide accurate, current, and complete registration and booking information.</li>
          <li>Maintain the confidentiality of your account credentials.</li>
          <li>Notify us immediately of any unauthorized use of your account.</li>
        </ul>
        <p>
          You are responsible for all activity conducted through your account. {SITE_NAME} may suspend or terminate
          accounts that violate these Terms or engage in fraudulent, abusive, or unlawful behavior.
        </p>
      </>
    ),
  },
  {
    title: "4. Booking Process & Confirmation",
    content: (
      <>
        <p>A booking is confirmed only when:</p>
        <ul>
          <li>You complete the booking form with required traveler and contact details.</li>
          <li>Payment is successfully received (full or partial, as specified at checkout).</li>
          <li>You receive a booking confirmation email, voucher, or invoice from {SITE_NAME}.</li>
          <li>The requested service is available and accepted by the relevant Service Provider.</li>
        </ul>
        <p>
          Until confirmation is issued, prices and availability remain subject to change. We reserve the right to
          decline or cancel a booking before confirmation due to unavailability, pricing errors, suspected fraud, or
          operational constraints.
        </p>
        <p>
          Please review your confirmation carefully upon receipt and contact us within 24 hours if any detail is
          incorrect.
        </p>
      </>
    ),
  },
  {
    title: "5. Pricing, Taxes & Fees",
    content: (
      <>
        <p>
          Prices displayed on the Platform are in Indian Rupees (INR) unless stated otherwise. Prices may include
          or exclude taxes, service fees, fuel surcharges, tolls, parking, driver allowances, entry tickets, meals,
          and other inclusions or exclusions as described on each listing.
        </p>
        <p>
          Quoted prices are indicative until payment is confirmed. Seasonal demand, fuel price changes, government
          taxes, or supplier rate revisions may affect final pricing. If a material price change occurs before
          confirmation, we will notify you and give you the option to proceed or cancel without charge.
        </p>
        <p>
          Promotional discounts, coupon codes, and special offers cannot be combined unless explicitly permitted and
          may be subject to validity dates and usage limits.
        </p>
      </>
    ),
  },
  {
    title: "6. Payment Terms",
    content: (
      <>
        <p>
          Depending on the service type, we may require full payment at booking or a partial advance with the balance
          due before travel or upon check-in, as stated during checkout.
        </p>
        <p>
          Payments are processed through authorized payment gateways such as Razorpay using secure encryption. By
          making a payment, you authorize us and our payment partners to charge the selected payment method for the
          booking amount and applicable fees.
        </p>
        <p>
          Failed or incomplete payments may result in automatic cancellation of the pending booking. {SITE_NAME} is
          not responsible for bank delays, UPI failures, or payment declines caused by your financial institution.
        </p>
      </>
    ),
  },
  {
    title: "7. User Responsibilities",
    content: (
      <>
        <p>When using our Platform and services, you agree to:</p>
        <ul>
          <li>Provide accurate names, ages, contact numbers, and travel dates for all passengers.</li>
          <li>
            Carry valid government-issued photo ID and any required permits, visas, or health documents for your
            destination.
          </li>
          <li>Arrive on time for pickups, check-ins, and scheduled activities.</li>
          <li>Follow instructions from drivers, hotel staff, and tour operators.</li>
          <li>Behave respectfully toward staff, other guests, and local communities.</li>
          <li>Not use the Platform for unlawful, misleading, or harmful purposes.</li>
        </ul>
        <p>
          {SITE_NAME} is not liable for missed services, denied boarding, or additional costs arising from incorrect
          information you provide, late arrival, lack of valid documents, or failure to comply with Service Provider
          rules.
        </p>
      </>
    ),
  },
  {
    title: "8. Cancellation & Refund Policy",
    content: (
      <>
        <p>
          Cancellation terms vary by service type, season, and Service Provider. The applicable policy will be shown
          at checkout and in your booking confirmation. General guidelines:
        </p>
        <h3>8.1 Tour packages</h3>
        <ul>
          <li>
            <strong>15+ days before departure:</strong> typically full refund minus processing or gateway fees, unless
            non-refundable components apply.
          </li>
          <li>
            <strong>7–14 days before departure:</strong> typically 50–75% refund depending on supplier policy.
          </li>
          <li>
            <strong>Less than 7 days or no-show:</strong> generally non-refundable; partial refunds may apply only at
            supplier discretion.
          </li>
        </ul>
        <h3>8.2 Hotels</h3>
        <ul>
          <li>Refundable and non-refundable room rates are displayed at booking time.</li>
          <li>Free cancellation windows, if offered, expire at the time stated in your confirmation.</li>
        </ul>
        <h3>8.3 Vehicles & transfers</h3>
        <ul>
          <li>Cancellations made 24+ hours before scheduled pickup may qualify for full or partial refund.</li>
          <li>Same-day cancellations or no-shows may forfeit the booking amount.</li>
        </ul>
        <p>
          To request cancellation, contact {SITE_CONTACT.email} or {SITE_CONTACT.phone} with your booking reference.
          Approved refunds are typically processed within <strong>7–10 business days</strong> to the original payment
          method. Bank processing times may vary.
        </p>
        <p>
          No refund is due for services already consumed, voluntary early departure, or issues caused by force majeure
          events (see Section 12).
        </p>
      </>
    ),
  },
  {
    title: "9. Modifications & Rescheduling",
    content: (
      <>
        <p>
          Change requests (date changes, vehicle upgrades, hotel room changes, passenger name corrections) are subject
          to availability and may incur amendment fees charged by {SITE_NAME} and/or the Service Provider.
        </p>
        <p>
          We will make reasonable efforts to accommodate changes but cannot guarantee approval. If a modification is
          not possible, standard cancellation terms may apply to the original booking.
        </p>
      </>
    ),
  },
  {
    title: "10. Service Provider Conduct & Quality",
    content: (
      <>
        <p>
          {SITE_NAME} selects partners based on quality standards, but we do not directly operate hotels, vehicles,
          or tour activities in most cases. Service quality, cleanliness, punctuality, and on-ground experience are
          primarily the responsibility of the Service Provider.
        </p>
        <p>
          If you experience a service issue during your trip, please notify us and the Service Provider promptly so
          we can attempt to resolve the matter. Complaints reported after completion of travel may limit our ability
          to investigate or offer remedies.
        </p>
        <p>
          We may, at our discretion, offer goodwill adjustments, alternate arrangements, or partial credits where
          appropriate, but this does not create an obligation for future bookings.
        </p>
      </>
    ),
  },
  {
    title: "11. AI Travel Assistant Disclaimer",
    content: (
      <>
        <p>
          Our AI assistant provides automated travel suggestions, pricing estimates, and itinerary ideas. AI outputs
          may contain errors, outdated information, or incomplete details. They do not constitute a binding offer,
          confirmed price, or guaranteed availability.
        </p>
        <p>
          Always verify important details—dates, prices, inclusions, cancellation rules, and availability—with our
          team or through the official checkout process before relying on AI responses for travel decisions.
        </p>
      </>
    ),
  },
  {
    title: "12. Force Majeure",
    content: (
      <>
        <p>
          Neither {SITE_NAME} nor Service Providers shall be liable for failure or delay in performance caused by
          events beyond reasonable control, including but not limited to:
        </p>
        <ul>
          <li>Natural disasters, floods, landslides, earthquakes, or severe weather.</li>
          <li>Strikes, riots, civil unrest, war, or government restrictions.</li>
          <li>Epidemics, pandemics, or public health emergencies.</li>
          <li>Road closures, flight cancellations, or fuel shortages.</li>
          <li>Internet outages, cyber incidents, or utility failures.</li>
        </ul>
        <p>
          In such cases, we will work with suppliers to offer rescheduling or credits where possible. Cash refunds
          depend on supplier policies and amounts recoverable from third parties.
        </p>
      </>
    ),
  },
  {
    title: "13. Intellectual Property",
    content: (
      <>
        <p>
          All content on the Platform—including logos, text, graphics, photographs, software, and design—is owned
          by or licensed to {SITE_NAME} and protected by copyright and trademark laws.
        </p>
        <p>
          You may not copy, reproduce, distribute, scrape, or create derivative works from our content without prior
          written permission. Limited personal, non-commercial use for trip planning is permitted.
        </p>
      </>
    ),
  },
  {
    title: "14. Prohibited Activities",
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for fraudulent bookings or payment disputes in bad faith.</li>
          <li>Attempt to hack, reverse engineer, or disrupt our systems or payment flows.</li>
          <li>Post false reviews or manipulate ratings.</li>
          <li>Resell our services without authorization.</li>
          <li>Harass our staff, partners, or other customers.</li>
          <li>Violate any applicable local, state, or national law while using our services.</li>
        </ul>
        <p>Violation may result in immediate account termination and legal action where appropriate.</p>
      </>
    ),
  },
  {
    title: "15. Limitation of Liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by law, {SITE_NAME} shall not be liable for indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data, goodwill, or travel enjoyment.
        </p>
        <p>
          Our total liability for any claim arising from a booking shall not exceed the amount you paid to{" "}
          {SITE_NAME} for that specific booking, except where liability cannot be excluded under applicable Indian law.
        </p>
        <p>
          We are not responsible for personal injury, property loss, theft, accidents, delays, or service failures
          caused by Service Providers, other travelers, or circumstances outside our reasonable control.
        </p>
      </>
    ),
  },
  {
    title: "16. Indemnification",
    content: (
      <>
        <p>
          You agree to indemnify and hold harmless {SITE_NAME}, its directors, employees, and partners from claims,
          damages, losses, and expenses (including reasonable legal fees) arising from your breach of these Terms,
          misuse of the Platform, violation of law, or harm caused to third parties during your travel.
        </p>
      </>
    ),
  },
  {
    title: "17. Dispute Resolution & Governing Law",
    content: (
      <>
        <p>
          These Terms are governed by the laws of India. Any dispute arising from or relating to these Terms or your
          use of the Platform shall first be attempted to be resolved through good-faith negotiation by contacting
          our support team.
        </p>
        <p>
          If unresolved within 30 days, disputes shall be subject to the exclusive jurisdiction of the courts in{" "}
          <strong>Noida, Uttar Pradesh, India</strong>, unless mandatory consumer protection laws grant you rights
          to pursue remedies in your local jurisdiction.
        </p>
      </>
    ),
  },
  {
    title: "18. Changes to These Terms",
    content: (
      <>
        <p>
          We may revise these Terms at any time. Updated Terms will be posted on this page with a revised &quot;Last
          updated&quot; date. Material changes affecting existing confirmed bookings will be communicated where
          reasonably practicable.
        </p>
        <p>Your continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.</p>
      </>
    ),
  },
  {
    title: "19. Contact Information",
    content: (
      <>
        <p>For questions about these Terms, bookings, cancellations, or support:</p>
        <ul>
          <li>
            <strong>{SITE_NAME}</strong>
          </li>
          <li>
            <strong>Address:</strong> {SITE_CONTACT.addressFull}
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
          </li>
          <li>
            <strong>Phone:</strong>{" "}
            <a href={`tel:${SITE_CONTACT.phoneTel}`}>{SITE_CONTACT.phone}</a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a href={SITE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {SITE_CONTACT.phone}
            </a>
          </li>
        </ul>
      </>
    ),
  },
];
