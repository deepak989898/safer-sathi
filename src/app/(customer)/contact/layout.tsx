import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Safar Sathi | Book Your Trip",
  description:
    "Call, email, or visit Safar Sathi at 352 Travel Hub, Connaught Place, New Delhi. Get help with tour packages, hotels, and vehicles.",
  path: "/contact",
  keywords: ["contact Safar Sathi", "travel agency Delhi", "tour booking support", "Safar Sathi phone"],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
