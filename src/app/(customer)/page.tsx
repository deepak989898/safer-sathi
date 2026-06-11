import Link from "next/link";
import {
  Bot,
  HeadphonesIcon,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchWidget } from "@/components/customer/search-widget";
import { PackageCard } from "@/components/customer/package-card";
import { getPackages } from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { HomeClient } from "./home-client";

const HERO_IMAGE = HERO_IMAGES.home;

export default async function HomePage() {
  const packages = await getPackages();
  const featured = packages.filter((p) => p.featured);

  return (
    <>
      <section
        className="relative flex min-h-[560px] items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg, oklch(0.22 0.08 264 / 0.88), oklch(0.52 0.19 264 / 0.65)), url(${HERO_IMAGE})`,
        }}
      >
        <div className="container mx-auto px-4 py-20 text-center">
          <HomeClient />
          <div className="mt-10">
            <SearchWidget />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={Sparkles}
            titleKey="aiAssistant"
            descKey="aiAssistantDesc"
          />
          <FeatureCard icon={Tag} titleKey="bestPrice" descKey="bestPriceDesc" />
          <FeatureCard icon={HeadphonesIcon} titleKey="support" descKey="supportDesc" />
          <FeatureCard icon={ShieldCheck} titleKey="secure" descKey="secureDesc" />
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary md:text-3xl">
                Featured Packages
              </h2>
              <p className="mt-2 text-muted-foreground">
                Handpicked destinations loved by thousands of travelers
              </p>
            </div>
            <Link href="/packages">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <HomeClient featured={featured} mode="grid" />
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Bot className="mx-auto mb-4 h-12 w-12" />
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready for Your Next Adventure?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Let our AI assistant plan the perfect trip for you, or browse our
            curated packages and book instantly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/ai-assistant">
              <Button size="lg" variant="secondary">
                Try AI Assistant
              </Button>
            </Link>
            <Link href="/packages">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Explore Packages
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  titleKey,
  descKey,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <FeatureText titleKey={titleKey} descKey={descKey} />
    </div>
  );
}

function FeatureText({
  titleKey,
  descKey,
}: {
  titleKey: string;
  descKey: string;
}) {
  return <HomeClient titleKey={titleKey} descKey={descKey} mode="feature" />;
}
