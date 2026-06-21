import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Travel Assistant | Safar Sathi",
  description:
    "Plan India trips in Hindi or English. Get package, hotel, and vehicle recommendations with Safar Sathi AI Travel Assistant.",
  path: "/ai-assistant",
  keywords: ["AI travel assistant", "India trip planner", "Hindi travel bot", "Safar Sathi AI"],
});

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
