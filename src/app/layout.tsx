import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/providers";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Safar Sathi | Travel | Comfort | Trust",
  description:
    "Discover incredible destinations across India with curated packages, instant booking, and 24/7 support.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: SITE_NAME,
    title: "Safar Sathi | Travel | Comfort | Trust",
    description:
      "Discover incredible destinations across India with curated packages, instant booking, and 24/7 support.",
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [{ url: "/images/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/images/favicon.svg",
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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
