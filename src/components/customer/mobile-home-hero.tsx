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
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";

const MOBILE_FEATURES = [
  { icon: Briefcase, label: "Curated Packages" },
  { icon: ShieldCheck, label: "Best Price Guarantee" },
  { icon: Headphones, label: "24/7 Support" },
] as const;

export function MobileFeatureCard() {
  return (
    <div className="mobile-feature-card rounded-2xl border border-white/60 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-border dark:bg-card/95">
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

export function MobileHomeHero() {
  const { locale } = useAppStore();
  const [searchExpanded, setSearchExpanded] = useState(false);

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title: t(locale, "hero", "title"),
    subtitle: t(locale, "hero", "subtitle"),
  }));

  return (
    <div className="md:hidden">
      <div className="relative overflow-visible">
        <HeroSlider
          slides={heroSlides}
          compact={!searchExpanded}
          className="mobile-hero-panel min-h-[460px] overflow-visible pb-0 sm:min-h-[500px]"
          mobileReferenceLayout
        />

        <div className="mobile-hero-feature-bridge pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4">
          <div className="pointer-events-auto mx-auto w-full max-w-md">
            <MobileFeatureCard />
          </div>
        </div>
      </div>

      <div className="mobile-hero-search relative z-20 mx-auto max-w-md px-4">
        <SearchWidget onExpandChange={setSearchExpanded} variant="mobile-pill" />
      </div>
    </div>
  );
}

export const MOBILE_SHOWCASE_TABS = [
  { id: "packages" as const, label: "Tour Packages", icon: Map, href: "/packages" },
  { id: "vehicles" as const, label: "Vehicles", icon: Car, href: "/vehicles" },
  { id: "hotels" as const, label: "Hotels", icon: Building2, href: "/hotels" },
];

export function MobileShowcaseTabs({
  activeTab,
  onChange,
}: {
  activeTab: "packages" | "vehicles" | "hotels";
  onChange: (tab: "packages" | "vehicles" | "hotels") => void;
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
}: {
  title: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl font-bold leading-tight text-[#1e3a5f] dark:text-foreground">
        {title}
      </h2>
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
