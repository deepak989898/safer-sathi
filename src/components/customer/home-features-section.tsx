"use client";

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

export function HomeFeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-6 md:py-16">
      {/* Mobile: horizontal snap slider — one card at a time */}
      <div className="md:hidden">
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.titleKey}
              {...feature}
              className="min-w-[85%] shrink-0 snap-center sm:min-w-[70%]"
            />
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {FEATURES.map((feature) => (
            <span
              key={feature.titleKey}
              className="h-1.5 w-1.5 rounded-full bg-primary/30"
              aria-hidden
            />
          ))}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.titleKey} {...feature} />
        ))}
      </div>
    </section>
  );
}
