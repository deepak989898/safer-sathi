import { SITE_CONTACT, SITE_NAME } from "@/lib/site-config";
import type { LegalSection } from "@/lib/legal/legal-sections";

export const PRIVACY_LAST_UPDATED = "June 2026";

export const privacySections: LegalSection[] = [
  {
    title: "1. Introduction",
    content: (
      <>
        <p>
          Welcome to {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). We operate the website{" "}
          <strong>thesafarsathi.com</strong> and related services that help you discover, compare, and book tour
          packages, hotels, vehicles, and travel-related services across India.
        </p>
        <p>
          This Privacy Policy explains what personal information we collect, why we collect it, how we use and
          protect it, and what choices you have. By using our website, mobile experience, AI travel assistant, or
          booking services, you agree to the practices described in this policy.
        </p>
        <p>
          We are committed to handling your data responsibly and in line with applicable Indian laws, including
          the Information Technology Act, 2000 and applicable rules, and the Digital Personal Data Protection Act,
          2023 (DPDP Act), where applicable to our processing activities.
        </p>
      </>
    ),
  },
  {
    title: "2. Information We Collect",
    content: (
      <>
        <p>We may collect the following categories of information:</p>
        <h3>2.1 Information you provide directly</h3>
        <ul>
          <li>
            <strong>Account details:</strong> name, email address, phone number, password (stored in encrypted
            form), and profile preferences.
          </li>
          <li>
            <strong>Booking details:</strong> travel dates, destinations, number of travelers, hotel preferences,
            vehicle requirements, special requests, and government ID details where required for travel or
            invoicing.
          </li>
          <li>
            <strong>Payment information:</strong> billing name, transaction references, and payment status. Full
            card or UPI credentials are processed by authorized payment gateways; we do not store complete payment
            card numbers on our servers.
          </li>
          <li>
            <strong>Communications:</strong> messages sent via contact forms, email, WhatsApp, phone support, and
            AI assistant conversations.
          </li>
          <li>
            <strong>Reviews and feedback:</strong> ratings, comments, and survey responses you choose to submit.
          </li>
        </ul>
        <h3>2.2 Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device and usage data:</strong> IP address, browser type, device identifiers, pages viewed,
            referral URLs, session duration, and interaction events.
          </li>
          <li>
            <strong>Location data:</strong> approximate location derived from IP address or, with your permission,
            more precise location for relevant travel suggestions.
          </li>
          <li>
            <strong>Cookies and similar technologies:</strong> see Section 8 below.
          </li>
        </ul>
        <h3>2.3 Information from third parties</h3>
        <ul>
          <li>Payment gateways confirming successful or failed transactions.</li>
          <li>Hotels, transport operators, and tour partners confirming availability or service delivery.</li>
          <li>Authentication providers if you sign in using supported third-party methods.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use personal information for the following purposes:</p>
        <ul>
          <li>Processing and confirming bookings for packages, hotels, vehicles, and related services.</li>
          <li>Sending booking confirmations, invoices, itinerary updates, and customer support responses.</li>
          <li>Verifying identity, preventing fraud, and maintaining platform security.</li>
          <li>Operating and improving our AI travel assistant and personalized recommendations.</li>
          <li>Analyzing website performance, visitor trends, and service quality.</li>
          <li>Sending promotional offers, travel tips, and newsletters where you have given consent.</li>
          <li>Complying with legal, tax, and regulatory obligations.</li>
          <li>Resolving disputes, enforcing our Terms of Service, and protecting our legal rights.</li>
        </ul>
        <p>
          We process your data only where we have a lawful basis, such as performance of a contract (fulfilling
          your booking), legitimate business interests (improving our services), compliance with law, or your
          consent where required.
        </p>
      </>
    ),
  },
  {
    title: "4. AI Assistant & Personalization",
    content: (
      <>
        <p>
          {SITE_NAME} offers an AI-powered travel assistant that can answer questions, suggest packages, and help
          you plan trips. When you use this feature, we may process:
        </p>
        <ul>
          <li>Your chat messages and travel queries.</li>
          <li>Session identifiers and device information to maintain conversation context.</li>
          <li>Booking history and browsing activity to provide relevant suggestions.</li>
        </ul>
        <p>
          AI responses are generated to assist your planning and do not replace official confirmations from
          {SITE_NAME} or third-party suppliers. We may use anonymized or aggregated chat data to improve response
          quality and train our systems. You may contact us to request limitation of AI personalization linked to
          your account.
        </p>
      </>
    ),
  },
  {
    title: "5. How We Share Your Information",
    content: (
      <>
        <p>
          We do <strong>not sell</strong> your personal data. We share information only when necessary:
        </p>
        <ul>
          <li>
            <strong>Service providers:</strong> hotels, resorts, vehicle operators, drivers, tour guides, and
            activity partners need guest names, contact details, and travel dates to deliver booked services.
          </li>
          <li>
            <strong>Payment processors:</strong> Razorpay and other authorized gateways to process payments
            securely.
          </li>
          <li>
            <strong>Technology partners:</strong> hosting, analytics, email delivery, customer support tools, and
            cloud storage providers bound by confidentiality obligations.
          </li>
          <li>
            <strong>Legal and safety:</strong> when required by law, court order, or government authority, or to
            protect the rights, property, or safety of {SITE_NAME}, our users, or the public.
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, with
            appropriate safeguards for your data.
          </li>
        </ul>
        <p>
          Third-party suppliers may have their own privacy practices. We encourage you to review their policies
          where applicable, especially for international travel components.
        </p>
      </>
    ),
  },
  {
    title: "6. Payment Data",
    content: (
      <>
        <p>
          Payments on {SITE_NAME} are processed through PCI-DSS compliant payment partners. We receive confirmation
          of payment status, transaction IDs, and limited billing metadata needed for accounting and customer
          support.
        </p>
        <p>
          We do not store your full debit/credit card number, CVV, or UPI PIN. Never share OTPs, passwords, or
          payment credentials with anyone claiming to represent {SITE_NAME} outside our official website and
          verified contact channels.
        </p>
      </>
    ),
  },
  {
    title: "7. Data Retention",
    content: (
      <>
        <p>We retain personal information only as long as necessary for the purposes described in this policy:</p>
        <ul>
          <li>
            <strong>Booking records:</strong> typically up to 7 years for tax, accounting, and legal compliance.
          </li>
          <li>
            <strong>Account data:</strong> while your account is active and for a reasonable period after closure.
          </li>
          <li>
            <strong>Marketing data:</strong> until you unsubscribe or withdraw consent.
          </li>
          <li>
            <strong>Analytics logs:</strong> in aggregated or anonymized form where possible.
          </li>
        </ul>
        <p>
          When data is no longer required, we securely delete or anonymize it in accordance with our retention
          schedule and applicable law.
        </p>
      </>
    ),
  },
  {
    title: "8. Cookies & Tracking Technologies",
    content: (
      <>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you signed in and remember your preferences.</li>
          <li>Maintain shopping and booking session state.</li>
          <li>Measure site traffic, page performance, and marketing effectiveness.</li>
          <li>Improve security and detect suspicious activity.</li>
        </ul>
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may affect booking
          functionality, login, and checkout. We may use analytics tools that collect anonymized usage statistics.
        </p>
      </>
    ),
  },
  {
    title: "9. Data Security",
    content: (
      <>
        <p>
          We implement administrative, technical, and organizational measures designed to protect your personal
          information, including:
        </p>
        <ul>
          <li>HTTPS encryption for data transmitted between your browser and our servers.</li>
          <li>Access controls limiting employee access to personal data on a need-to-know basis.</li>
          <li>Secure authentication and role-based permissions for admin systems.</li>
          <li>Regular monitoring and updates to our infrastructure and applications.</li>
        </ul>
        <p>
          No method of transmission or storage is 100% secure. While we strive to protect your data, we cannot
          guarantee absolute security. Please use strong passwords and notify us immediately if you suspect
          unauthorized access to your account.
        </p>
      </>
    ),
  },
  {
    title: "10. International Data Transfers",
    content: (
      <>
        <p>
          Our primary operations and data processing are based in India. Some technology service providers may
          process data on servers located outside India. When this occurs, we take reasonable steps to ensure
          appropriate contractual and security safeguards are in place consistent with applicable data protection
          requirements.
        </p>
      </>
    ),
  },
  {
    title: "11. Children's Privacy",
    content: (
      <>
        <p>
          {SITE_NAME} is not directed at children under 18 years of age. We do not knowingly collect personal
          information from minors without verifiable parental or guardian consent. If you believe a child has
          provided us personal data, please contact us and we will take steps to delete such information.
        </p>
        <p>
          Bookings for minors may be made by a parent or legal guardian who provides necessary traveler details for
          ticketing and accommodation purposes.
        </p>
      </>
    ),
  },
  {
    title: "12. Your Rights & Choices",
    content: (
      <>
        <p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>Request deletion of data where legally permitted.</li>
          <li>Withdraw consent for marketing communications at any time.</li>
          <li>Object to or restrict certain processing activities.</li>
          <li>Receive a copy of your data in a portable format where applicable.</li>
          <li>Lodge a grievance with us regarding our data handling practices.</li>
        </ul>
        <p>
          To exercise these rights, email us at{" "}
          <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a> with the subject line &quot;Privacy
          Request&quot; and include your name, registered email or phone, and a description of your request. We
          may verify your identity before responding and will aim to reply within 30 days.
        </p>
      </>
    ),
  },
  {
    title: "13. Marketing Communications",
    content: (
      <>
        <p>
          With your consent, we may send promotional emails, SMS, or WhatsApp messages about offers, new packages,
          and travel deals. You can opt out at any time by:
        </p>
        <ul>
          <li>Clicking the unsubscribe link in marketing emails.</li>
          <li>Replying STOP to promotional SMS where supported.</li>
          <li>Contacting us at {SITE_CONTACT.email}.</li>
        </ul>
        <p>
          Even if you opt out of marketing, we will still send transactional messages related to your bookings,
          payments, and account security.
        </p>
      </>
    ),
  },
  {
    title: "14. Third-Party Links",
    content: (
      <>
        <p>
          Our website may contain links to third-party websites, maps, payment pages, or partner portals. We are
          not responsible for the privacy practices or content of those external sites. We recommend reviewing
          their privacy policies before providing personal information.
        </p>
      </>
    ),
  },
  {
    title: "15. Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our services, legal requirements,
          or business practices. The &quot;Last updated&quot; date at the top of this page will indicate when
          revisions were made. Material changes may be communicated via email or a notice on our website.
        </p>
        <p>Continued use of our services after updates constitutes acceptance of the revised policy.</p>
      </>
    ),
  },
  {
    title: "16. Contact & Grievance",
    content: (
      <>
        <p>
          If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please
          contact:
        </p>
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
        </ul>
        <p>
          We will acknowledge grievances promptly and work to resolve them in accordance with applicable Indian data
          protection regulations.
        </p>
      </>
    ),
  },
];
