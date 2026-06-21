import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ | Safar Sathi Travel Help",
  description:
    "Answers about tour packages, hotel bookings, vehicle rental, payments, cancellations, and Safar Sathi support.",
  path: "/faq",
  keywords: ["Safar Sathi FAQ", "travel booking help", "tour package questions", "India travel support"],
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
