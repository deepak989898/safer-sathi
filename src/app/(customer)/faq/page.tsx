"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { contactLinks, whatsAppUrl } from "@/lib/site-contact-links";
import { SITE_CONTACT } from "@/lib/site-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FaqItem = { q: string; a: ReactNode };

const contactSupportAnswer = (
  <>
    Call{" "}
    <a href={contactLinks.phone} className="font-medium text-primary underline-offset-4 hover:underline">
      {SITE_CONTACT.phone}
    </a>
    , WhatsApp{" "}
    <a
      href={whatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#128C7E] underline-offset-4 hover:underline dark:text-[#25D366]"
    >
      {SITE_CONTACT.phone.replace("+91 ", "")}
    </a>
    , email{" "}
    <a
      href={contactLinks.email}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {SITE_CONTACT.email}
    </a>
    , or visit us at{" "}
    <a
      href={contactLinks.maps}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {SITE_CONTACT.addressFull}
    </a>
    .
  </>
);

const faqData: Record<string, FaqItem[]> = {
  general: [
    {
      q: "What is Safar Sathi?",
      a: "Safar Sathi is a travel platform offering tour packages, hotel bookings, vehicle rentals, and bus tickets across India.",
    },
    {
      q: "How do I book a trip?",
      a: "Browse our packages or services, select your dates, and proceed to checkout. You can also use our Assistant for personalized recommendations.",
    },
    {
      q: "Is my payment secure?",
      a: "Yes, all payments are processed through secure, encrypted gateways with instant booking confirmation.",
    },
    {
      q: "How do I contact support?",
      a: contactSupportAnswer,
    },
  ],
  booking: [
    {
      q: "Can I modify my booking?",
      a: "Yes, most bookings can be modified up to 48 hours before travel. Contact our support team or use the My Bookings section.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Cancellation policies vary by service. Package bookings typically allow free cancellation up to 7 days before departure.",
    },
    {
      q: "Do you offer group discounts?",
      a: "Yes, we offer special rates for groups of 10 or more. Contact us for a custom quote.",
    },
  ],
  payment: [
    {
      q: "What payment methods are accepted?",
      a: "We accept credit/debit cards, UPI, net banking, and wallets through Razorpay.",
    },
    {
      q: "Can I pay in installments?",
      a: "Selected packages support partial payment with the balance due before travel.",
    },
  ],
  assistant: [
    {
      q: "How does the Assistant work?",
      a: "Our Assistant understands your preferences and suggests tailored travel options in real time.",
    },
    {
      q: "Is the Assistant available 24/7?",
      a: "Yes, the Assistant is available round the clock for trip planning and support queries.",
    },
  ],
};

function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <details
          key={i}
          className="group rounded-lg border bg-card [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer items-center justify-between p-4 font-medium">
            {item.q}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t px-4 pb-4 pt-2 text-sm text-muted-foreground">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

export default function FAQPage() {
  return (
    <>
      <PageHero
        title="Frequently Asked Questions"
        subtitle="Find answers to common questions about booking and travel"
        image={HERO_IMAGES.faq}
      />

      <section className="container mx-auto max-w-3xl px-4 py-10">
        <Tabs defaultValue="general">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="booking">Booking</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
          </TabsList>

          {Object.entries(faqData).map(([key, items]) => (
            <TabsContent key={key} value={key}>
              <FaqAccordion items={items} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  );
}
