"use client";

import { useEffect, useState } from "react";
import { HeadphonesIcon, ShieldCheck, Tag } from "lucide-react";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: AssistantIcon, titleKey: "aiAssistant", descKey: "aiAssistantDesc" },
  { icon: Tag, titleKey: "bestPrice", descKey: "bestPriceDesc" },
  { icon: HeadphonesIcon, titleKey: "support", descKey: "supportDesc" },
  { icon: ShieldCheck, titleKey: "secure", descKey: "secureDesc" },
] as const;

const AUTO_ADVANCE_MS = 5000;

function FeatureCard({
  icon: Icon,
  titleKey,
  descKey,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
  className?: string;
}) {
  const { locale } = useAppStore();

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{t(locale, "features", titleKey)}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(locale, "features", descKey)}
      </p>
    </div>
  );
}

function MobileFeatureSlider() {
  const [index, setIndex] = useState(0);
  const active = FEATURES[index] ?? FEATURES[0];

  useEffect(() => {
    if (FEATURES.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % FEATURES.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (!active) return null;

  return (
    <div className="md:hidden">
      <div className="relative min-h-[190px] overflow-hidden">
        {FEATURES.map((feature, featureIndex) => (
          <div
            key={feature.titleKey}
            className={cn(
              "absolute inset-x-0 top-0 transition-opacity duration-700 ease-in-out",
              featureIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden={featureIndex !== index}
          >
            <FeatureCard {...feature} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {FEATURES.map((feature, featureIndex) => (
          <button
            key={feature.titleKey}
            type="button"
            aria-label={`Go to feature ${featureIndex + 1}`}
            onClick={() => setIndex(featureIndex)}
            className={cn(
              "h-2 rounded-full transition-all",
              featureIndex === index
                ? "w-8 bg-primary"
                : "w-2 bg-primary/30 hover:bg-primary/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function HomeFeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-10 md:py-16">
      <MobileFeatureSlider />

      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.titleKey} {...feature} />
        ))}
      </div>
    </section>
  );
}
