import Link from "next/link";
import {
  HeadphonesIcon,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { Button } from "@/components/ui/button";
import { HomeShowcase } from "@/components/customer/home-showcase";
import { HomeClient } from "./home-client";
import { getHotels, getPackages, getVehicles } from "@/lib/data-service";

export default async function HomePage() {
  const [packages, hotels, vehicles] = await Promise.all([
    getPackages(),
    getHotels(),
    getVehicles(),
  ]);

  const featuredPackages = packages.filter((p) => p.featured).slice(0, 3);
  const featuredHotels = hotels.slice(0, 3);
  const featuredVehicles = vehicles.slice(0, 3);

  return (
    <>
      <HomeShowcase
        featuredPackages={featuredPackages}
        featuredHotels={featuredHotels}
        featuredVehicles={featuredVehicles}
      />

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={AssistantIcon}
            titleKey="aiAssistant"
            descKey="aiAssistantDesc"
          />
          <FeatureCard icon={Tag} titleKey="bestPrice" descKey="bestPriceDesc" />
          <FeatureCard icon={HeadphonesIcon} titleKey="support" descKey="supportDesc" />
          <FeatureCard icon={ShieldCheck} titleKey="secure" descKey="secureDesc" />
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <AssistantIcon className="mx-auto mb-4 h-12 w-12" />
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready for Your Next Adventure?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Let our travel assistant plan the perfect trip for you, or browse our
            curated packages and book instantly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/ai-assistant">
              <Button size="lg" variant="secondary">
                Try Assistant
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
      <HomeClient titleKey={titleKey} descKey={descKey} mode="feature" />
    </div>
  );
}
