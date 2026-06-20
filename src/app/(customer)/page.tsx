import Link from "next/link";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { Button } from "@/components/ui/button";
import { TryAssistantButton } from "@/components/ai/try-assistant-button";
import { HomeShowcase } from "@/components/customer/home-showcase";
import { ImageBannerSection } from "@/components/customer/page-hero";
import { getHotels, getPackages, getVehicles } from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";

export const dynamic = "force-dynamic";

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

      <ImageBannerSection className="py-16" image={HERO_IMAGES.cta}>
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
            <TryAssistantButton variant="secondary" showIcon />
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
      </ImageBannerSection>
    </>
  );
}
