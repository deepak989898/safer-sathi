"use client";

import Link from "next/link";
import {
  BadgePercent,
  Headphones,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { HotelCard } from "@/components/customer/hotel-card";
import { PackageCard } from "@/components/customer/package-card";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { SafeImage } from "@/components/ui/safe-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { buildHomeTestimonials } from "@/lib/catalog/home-testimonials";
import type { PopularDestinationItem } from "@/lib/catalog/homepage-showcase";
import { useAppStore } from "@/store/app-store";
import type { Hotel, Review, TourPackage, Vehicle } from "@/types";

const TRUST_ITEMS = [
  { icon: BadgePercent, label: "Best Price Guarantee", desc: "Get the best deals always" },
  { icon: Headphones, label: "24/7 Support", desc: "We are here to help" },
  { icon: Users, label: "Trusted by 10K+", desc: "Happy travelers" },
  { icon: ShieldCheck, label: "Secure Booking", desc: "100% safe and secure" },
] as const;

interface DesktopHomeSectionsProps {
  popularDestinations: PopularDestinationItem[];
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
  reviews: Review[];
}

export function DesktopHomeSections({
  popularDestinations,
  featuredPackages,
  featuredHotels,
  featuredVehicles,
  reviews,
}: DesktopHomeSectionsProps) {
  const { locale } = useAppStore();
  const topPackages = featuredPackages.slice(0, 4);
  const topHotels = featuredHotels.slice(0, 4);
  const topVehicles = featuredVehicles.slice(0, 4);

  const testimonials = buildHomeTestimonials(reviews, locale, 3);

  return (
    <section className="desktop-search-section-pad hidden bg-background md:block">
      <div className="container mx-auto px-4 pb-16">
        <DesktopTrustBar />

        <SectionHeader
          title={locale === "hi" ? "लोकप्रिय गंतव्य" : "Popular Destinations"}
          subtitle={
            locale === "hi"
              ? "सबसे पसंदीदा जगहें एक्सप्लोर करें"
              : "Explore the most loved places"
          }
          href="/packages"
          locale={locale}
        />
        <div className="grid grid-cols-5 gap-4">
          {popularDestinations.map((dest) => (
            <Link
              key={dest.name}
              href={dest.href}
              className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <SafeImage
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  style={{ objectPosition: dest.imagePosition ?? "center" }}
                  sizes="(min-width: 768px) 20vw, 50vw"
                />
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  From {formatCurrency(dest.price, locale)}
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="font-semibold text-[#0c2444]">{dest.name}</p>
                <p className="text-xs text-muted-foreground">{dest.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        <CatalogSection
          title={locale === "hi" ? "टॉप टूर पैकेज" : "Top Tour Packages"}
          subtitle={
            locale === "hi" ? "आपके लिए चुनिंदा पैकेज" : "Handpicked packages for you"
          }
          href="/packages"
          locale={locale}
        >
          {topPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
          ))}
        </CatalogSection>

        <CatalogSection
          title={locale === "hi" ? "टॉप होटल" : "Top Hotels"}
          subtitle={
            locale === "hi" ? "बेहतरीन रहने के विकल्प" : "Premium stays across India"
          }
          href="/hotels"
          locale={locale}
        >
          {topHotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
          ))}
        </CatalogSection>

        <CatalogSection
          title={locale === "hi" ? "टॉप वाहन" : "Top Vehicles"}
          subtitle={
            locale === "hi" ? "हर यात्रा के लिए आरामदायक वाहन" : "Comfortable rides for every journey"
          }
          href="/vehicles"
          locale={locale}
        >
          {topVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} locale={locale} />
          ))}
        </CatalogSection>

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

        <div className="mt-14">
          <h2 className="mb-2 text-center text-2xl font-bold text-[#0c2444] lg:text-3xl">
            {locale === "hi" ? "यात्रियों की राय" : "What Our Travelers Say"}
          </h2>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            {locale === "hi"
              ? "हज़ारों खुश यात्रियों की वास्तविक प्रतिक्रिया"
              : "Real feedback from thousands of happy travelers"}
          </p>
          <div className="grid grid-cols-3 gap-5">
            {testimonials.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border bg-white p-6 shadow-[0_4px_24px_rgba(12,36,68,0.08)]"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < item.rating
                          ? "fill-[#f97316] text-[#f97316]"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-[#334155]">
                  &ldquo;{item.comment}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {item.userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-[#0c2444]">{item.userName}</p>
                    <p className="text-xs text-muted-foreground">{item.tourLabel}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
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
          <div>
            <p className="text-sm font-semibold text-[#0c2444]">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CatalogSection({
  title,
  subtitle,
  href,
  locale,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  locale: "en" | "hi";
  children: React.ReactNode;
}) {
  return (
    <div className="mt-14">
      <SectionHeader title={title} subtitle={subtitle} href={href} locale={locale} />
      <div className="grid grid-cols-4 gap-5">{children}</div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  locale,
}: {
  title: string;
  subtitle?: string;
  href: string;
  locale: "en" | "hi";
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-[#0c2444] lg:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-primary hover:underline"
      >
        {locale === "hi" ? "सभी देखें" : "View All"}
      </Link>
    </div>
  );
}
