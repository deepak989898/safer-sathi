import type { Metadata } from "next";
import { appUrl, SITE_NAME } from "@/lib/site-config";
import { DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE } from "@/lib/seo/schema";

export interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
}

function absoluteImage(image?: string): string {
  if (!image) return DEFAULT_OG_IMAGE;
  if (image.startsWith("http")) return image;
  return appUrl(image.startsWith("/") ? image : `/${image}`);
}

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const canonical = appUrl(input.path);
  const image = absoluteImage(input.image);
  const keywords = [...new Set([...(input.keywords ?? []), ...DEFAULT_KEYWORDS])].slice(0, 15);

  return {
    title: input.title,
    description: input.description.slice(0, 160),
    keywords,
    alternates: { canonical },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: input.type ?? "website",
      locale: "en_IN",
      url: canonical,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description.slice(0, 160),
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description.slice(0, 160),
      images: [image],
    },
  };
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
