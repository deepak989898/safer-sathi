import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { travelAgencySchema } from "@/lib/seo/schema";
import { getAppUrl, SITE_NAME } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const siteUrl = getAppUrl();

const rootSeo = buildPageMetadata({
  title: "Safar Sathi | Travel | Comfort | Trust",
  description:
    "Discover incredible destinations across India with curated tour packages, hotels, vehicles, instant booking, and 24/7 support.",
  path: "/",
  keywords: [
    "India tour packages",
    "Manali tour package",
    "Goa holiday package",
    "hotel booking India",
    "tempo traveller rental",
    "Safar Sathi",
  ],
});

export const metadata: Metadata = {
  ...rootSeo,
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/images/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.png",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} light h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
        <JsonLd data={travelAgencySchema()} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AnalyticsScripts />
        <Providers>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
