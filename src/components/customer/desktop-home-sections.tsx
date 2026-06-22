"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Headphones,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { PackageCard } from "@/components/customer/package-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";
import type { Review, TourPackage } from "@/types";

const TRUST_ITEMS = [
  { icon: BadgePercent, label: "Best Price Guarantee" },
  { icon: Headphones, label: "24/7 Support" },
  { icon: Users, label: "Trusted by 10K+" },
  { icon: ShieldCheck, label: "Secure Booking" },
] as const;

const POPULAR_DESTINATIONS = [
  {
    name: "Rajasthan",
    subtitle: "Royal Heritage",
    price: 4999,
    image: TRAVEL_IMAGES.goldenTriangle,
    href: "/packages?query=Rajasthan",
  },
  {
    name: "Kerala",
    subtitle: "Backwaters & Hills",
    price: 5999,
    image: TRAVEL_IMAGES.keralaBackwaters,
    href: "/packages?query=Kerala",
  },
  {
    name: "Goa",
    subtitle: "Beaches & Nightlife",
    price: 3999,
    image: TRAVEL_IMAGES.beachResort,
    href: "/packages?query=Goa",
  },
  {
    name: "Himachal",
    subtitle: "Mountains & Adventure",
    price: 5499,
    image: TRAVEL_IMAGES.manaliAdventure,
    href: "/packages?query=Manali",
  },
  {
    name: "Kashmir",
    subtitle: "Paradise on Earth",
    price: 6999,
    image: TRAVEL_IMAGES.charDham,
    href: "/packages?query=Kashmir",
  },
] as const;

interface DesktopHomeSectionsProps {
  featuredPackages: TourPackage[];
  reviews: Review[];
}

export function DesktopHomeSections({
  featuredPackages,
  reviews,
}: DesktopHomeSectionsProps) {
  const { locale } = useAppStore();
  const topPackages = featuredPackages.slice(0, 4);
  const topReviews = reviews.slice(0, 3);

  return (
    <section className="desktop-search-section-pad hidden bg-background md:block">
      <div className="container mx-auto px-4 pb-16">
        <DesktopTrustBar />

        <SectionHeader
          title={locale === "hi" ? "लोकप्रिय गंतव्य" : "Popular Destinations"}
          href="/packages"
          locale={locale}
        />
        <div className="grid grid-cols-5 gap-4">
          {POPULAR_DESTINATIONS.map((dest) => (
            <Link
              key={dest.name}
              href={dest.href}
              className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="20vw"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10">
                  <p className="text-sm font-semibold text-white">
                    From {formatCurrency(dest.price, locale)}
                  </p>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-[#0c2444]">{dest.name}</p>
                <p className="text-xs text-muted-foreground">{dest.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14">
          <SectionHeader
            title={locale === "hi" ? "टॉप टूर पैकेज" : "Top Tour Packages"}
            href="/packages"
            locale={locale}
          />
          <div className="grid grid-cols-4 gap-5">
            {topPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl bg-[#0c2444] px-8 py-7 text-white shadow-lg">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">
                🎁
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {locale === "hi" ? "आपके लिए विशेष ऑफ़र!" : "Special Offers for You!"}
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  {locale === "hi"
                    ? "चुनिंदा पैकेज पर 30% तक की छूट — सीमित समय के लिए।"
                    : "Get up to 30% off on select packages. Limited time only."}
                </p>
              </div>
            </div>
            <Link href="/packages">
              <Button
                variant="secondary"
                className="rounded-full bg-white px-6 text-[#0c2444] hover:bg-white/90"
              >
                {locale === "hi" ? "ऑफ़र देखें" : "View Offers"}
              </Button>
            </Link>
          </div>
        </div>

        {topReviews.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-8 text-center text-2xl font-bold text-[#0c2444] lg:text-3xl">
              {locale === "hi" ? "यात्रियों की राय" : "What Our Travelers Say"}
            </h2>
            <div className="grid grid-cols-3 gap-5">
              {topReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border bg-card p-6 shadow-sm"
                >
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{localizedText(review.comment, locale)}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3 border-t pt-4">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {review.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{review.userName}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {review.serviceType.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DesktopTrustBar() {
  return (
    <div className="mb-12 grid grid-cols-4 gap-4 rounded-2xl border bg-card px-6 py-5 shadow-sm">
      {TRUST_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <item.icon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-[#0c2444]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  href,
  locale,
}: {
  title: string;
  href: string;
  locale: "en" | "hi";
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold text-[#0c2444] lg:text-3xl">{title}</h2>
      <Link
        href={href}
        className="text-sm font-semibold text-primary hover:underline"
      >
        {locale === "hi" ? "सभी देखें" : "View All"}
      </Link>
    </div>
  );
}
