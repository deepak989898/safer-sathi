import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_CONTACT } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Safar Sathi | Book Your Trip",
  description: `Call, WhatsApp, email, or visit Safar Sathi at ${SITE_CONTACT.addressFull}. Get help with tour packages, hotels, and vehicles.`,
  path: "/contact",
  keywords: ["contact Safar Sathi", "travel agency Noida", "tour booking support", "Safar Sathi phone"],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
