"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  Headphones,
  Map,
  ShieldCheck,
} from "lucide-react";
import { HeroSlider } from "@/components/customer/hero-slider";
import { SearchWidget } from "@/components/customer/search-widget";
import { MobileShowcaseCard } from "@/components/customer/mobile-showcase-card";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import type { MobileShowcaseItem } from "@/lib/catalog/homepage-showcase";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

const MOBILE_FEATURES = [
  { icon: Briefcase, label: "Curated Packages" },
  { icon: ShieldCheck, label: "Best Price Guarantee" },
  { icon: Headphones, label: "24/7 Support" },
] as const;

export function MobileFeatureCard() {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm dark:border-border dark:bg-card">
      <div className="grid grid-cols-3 gap-1">
        {MOBILE_FEATURES.map((feature) => (
          <div key={feature.label} className="flex flex-col items-center px-1 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <feature.icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
              {feature.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const MOBILE_SHOWCASE_TABS = [
  { id: "packages" as const, label: "Tour Packages", icon: Map, href: "/packages" },
  { id: "vehicles" as const, label: "Vehicles", icon: Car, href: "/vehicles" },
  { id: "hotels" as const, label: "Hotels", icon: Building2, href: "/hotels" },
];

type ShowcaseTab = "packages" | "vehicles" | "hotels";

interface MobileHomeShowcaseProps {
  mobilePackages: MobileShowcaseItem[];
  mobileHotels: MobileShowcaseItem[];
  mobileVehicles: MobileShowcaseItem[];
}

const MOBILE_SECTION_COPY: Record<ShowcaseTab, { title: string; href: string }> = {
  packages: { title: "Handpicked destinations", href: "/packages" },
  hotels: { title: "Popular stays", href: "/hotels" },
  vehicles: { title: "Premium rides", href: "/vehicles" },
};

export function MobileHomeShowcase({
  mobilePackages,
  mobileHotels,
  mobileVehicles,
}: MobileHomeShowcaseProps) {
  const { locale } = useAppStore();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<ShowcaseTab>("packages");

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title: t(locale, "hero", "title"),
    subtitle: t(locale, "hero", "subtitle"),
  }));

  const mobileSection = MOBILE_SECTION_COPY[mobileTab];

  const showcaseItems =
    mobileTab === "packages"
      ? mobilePackages
      : mobileTab === "hotels"
        ? mobileHotels
        : mobileVehicles;

  return (
    <div className="mobile-hero-stack overflow-x-hidden md:hidden">
      <div className="relative">
        <HeroSlider
          slides={heroSlides}
          compact={!searchExpanded}
          className="min-h-[400px] sm:min-h-[430px]"
          mobileReferenceLayout
        />

        {!searchExpanded && (
          <div className="mobile-search-bridge pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4">
            <div className="pointer-events-auto mx-auto max-w-md">
              <SearchWidget onExpandChange={setSearchExpanded} variant="mobile-pill" />
            </div>
          </div>
        )}
      </div>

      <section
        className={`relative z-20 bg-background pb-6 ${
          searchExpanded ? "pt-1" : "mobile-search-section-pad"
        }`}
      >
        <div className="container mx-auto px-4">
          {searchExpanded && (
            <div className="mx-auto mb-3 max-w-md">
              <SearchWidget onExpandChange={setSearchExpanded} variant="mobile-pill" />
            </div>
          )}

          <MobileShowcaseTabs activeTab={mobileTab} onChange={setMobileTab} />

          <div className="mt-4">
            <MobileShowcaseHeader
              title={mobileSection.title}
              href={mobileSection.href}
              count={showcaseItems.length}
            />

            <div className="grid grid-cols-2 gap-3">
              {showcaseItems.map((item) => (
                <MobileShowcaseCard
                  key={`${mobileTab}-${item.slug}`}
                  layout="grid"
                  href={item.href}
                  image={item.image}
                  title={item.title}
                  subtitle={item.subtitle}
                  price={item.price}
                  locale={locale}
                />
              ))}
            </div>

            {showcaseItems.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No items to show yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function MobileShowcaseTabs({
  activeTab,
  onChange,
}: {
  activeTab: ShowcaseTab;
  onChange: (tab: ShowcaseTab) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-full border bg-white p-1 shadow-sm dark:bg-card">
      {MOBILE_SHOWCASE_TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <div key={tab.id} className="flex min-w-0 flex-1 items-center">
            {index > 0 && <span className="h-6 w-px shrink-0 bg-border" aria-hidden />}
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function MobileShowcaseHeader({
  title,
  href,
  count,
}: {
  title: string;
  href: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-serif text-xl font-bold leading-tight text-[#1e3a5f] dark:text-foreground">
          {title}
        </h2>
        {count !== undefined && count > 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{count} available</p>
        ) : null}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:bg-card"
      >
        View All
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
