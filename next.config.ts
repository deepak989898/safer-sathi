import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "nodemailer",
    "jwks-rsa",
    "jose",
  ],
  async redirects() {
    // Dead AI city-keyword blogs (GSC 404s) → live package / search pages.
    return [
      {
        source: "/blog/orai-to-ahmedabad-tour",
        destination: "/packages/golden-triangle",
        permanent: true,
      },
      {
        source: "/blog/orai-to-ahmedabad-trip",
        destination: "/packages/golden-triangle",
        permanent: true,
      },
      {
        source: "/blog/orai-to-kerala-package",
        destination: "/packages/kerala-backwater",
        permanent: true,
      },
      {
        source: "/blog/orai-to-manali-train-ticket-price",
        destination: "/packages/himachal-adventure",
        permanent: true,
      },
      {
        source: "/blog/orai-to-rishikesh-tour",
        destination: "/packages/kedarnath-yatra",
        permanent: true,
      },
      {
        source: "/blog/orai-to-coorg-tour",
        destination: "/packages/ooty-mysore",
        permanent: true,
      },
      {
        source: "/blog/orai-to-ooty-trip",
        destination: "/packages/ooty-mysore",
        permanent: true,
      },
      {
        source: "/blog/group-tour-from-orai",
        destination: "/packages",
        permanent: true,
      },
      {
        source: "/blog/bus-service-orai",
        destination: "/bus/search",
        permanent: true,
      },
      {
        source: "/blog/best-places-to-visit-in-haridwar",
        destination: "/packages/kedarnath-yatra",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "i.travelapi.com",
      },
      {
        protocol: "https",
        hostname: "**.travelapi.com",
      },
      {
        protocol: "https",
        hostname: "images.travelapi.com",
      },
      {
        protocol: "https",
        hostname: "images.trvl-media.com",
      },
      {
        protocol: "https",
        hostname: "cdn.tripjack.com",
      },
    ],
  },
};

export default nextConfig;
