import { appUrl, SITE_CONTACT, SITE_NAME } from "@/lib/site-config";
import { SITE_FAVICON_SVG } from "@/lib/site-icons";

/** Default share image for Open Graph / Twitter */
export const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85";

export const DEFAULT_KEYWORDS = [
  "Safar Sathi",
  "India tour packages",
  "travel booking",
  "hotels India",
  "vehicle rental India",
  "holiday packages",
];

export const BUSINESS_HOURS = [
  { day: "Monday", opens: "09:00", closes: "21:00" },
  { day: "Tuesday", opens: "09:00", closes: "21:00" },
  { day: "Wednesday", opens: "09:00", closes: "21:00" },
  { day: "Thursday", opens: "09:00", closes: "21:00" },
  { day: "Friday", opens: "09:00", closes: "21:00" },
  { day: "Saturday", opens: "09:00", closes: "21:00" },
  { day: "Sunday", opens: "10:00", closes: "20:00" },
] as const;

export function googleMapsUrl(): string {
  const query = encodeURIComponent(SITE_CONTACT.addressFull);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function travelAgencySchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    url: appUrl(),
    logo: appUrl(SITE_FAVICON_SVG),
    image: DEFAULT_OG_IMAGE,
    description:
      "Safar Sathi — curated tour packages, hotels, and vehicles across India with instant booking and 24/7 support.",
    telephone: SITE_CONTACT.phone,
    email: SITE_CONTACT.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONTACT.addressLine1,
      addressLocality: "New Delhi",
      postalCode: "110001",
      addressCountry: "IN",
    },
    openingHoursSpecification: BUSINESS_HOURS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: [appUrl(), SITE_CONTACT.whatsappUrl],
    areaServed: { "@type": "Country", name: "India" },
    priceRange: "₹₹",
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function touristTripSchema(input: {
  name: string;
  description: string;
  url: string;
  image?: string;
  price?: number;
  durationDays?: number;
  destination?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image ?? DEFAULT_OG_IMAGE,
    touristType: "Leisure",
    ...(input.destination ? { itinerary: { "@type": "Place", name: input.destination } } : {}),
    offers: input.price
      ? {
          "@type": "Offer",
          price: input.price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: input.url,
        }
      : undefined,
  };
}

export function hotelSchema(input: {
  name: string;
  description: string;
  url: string;
  image?: string;
  priceFrom?: number;
  starRating?: number;
  city?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image ?? DEFAULT_OG_IMAGE,
    ...(input.city ? { address: { "@type": "PostalAddress", addressLocality: input.city, addressCountry: "IN" } } : {}),
    starRating: input.starRating
      ? { "@type": "Rating", ratingValue: input.starRating, bestRating: 5 }
      : undefined,
    priceRange: input.priceFrom ? `From ₹${input.priceFrom}` : undefined,
    aggregateRating:
      input.rating && input.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: input.rating,
            reviewCount: input.reviewCount,
            bestRating: 5,
          }
        : undefined,
  };
}

export function vehicleRentalSchema(input: {
  name: string;
  description: string;
  url: string;
  image?: string;
  pricePerDay?: number;
  seats?: number;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image ?? DEFAULT_OG_IMAGE,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    category: "Vehicle Rental",
    offers: input.pricePerDay
      ? {
          "@type": "Offer",
          price: input.pricePerDay,
          priceCurrency: "INR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: input.pricePerDay,
            priceCurrency: "INR",
            unitText: "DAY",
          },
          availability: "https://schema.org/InStock",
          url: input.url,
        }
      : undefined,
    additionalProperty: input.seats
      ? [{ "@type": "PropertyValue", name: "seats", value: input.seats }]
      : undefined,
  };
}

export function blogPostingSchema(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: input.url,
    image: input.image ?? DEFAULT_OG_IMAGE,
    author: { "@type": "Person", name: input.author ?? SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: appUrl(SITE_FAVICON_SVG) },
    },
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    mainEntityOfPage: input.url,
  };
}

export function faqSchema(faq: { question: string; answer: string }[]) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function reviewSchema(input: {
  itemName: string;
  rating: number;
  reviewCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.itemName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: input.rating,
      reviewCount: input.reviewCount,
      bestRating: 5,
    },
  };
}
