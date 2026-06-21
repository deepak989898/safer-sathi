import Link from "next/link";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { Button } from "@/components/ui/button";
import { TryAssistantButton } from "@/components/ai/try-assistant-button";
import { HomeShowcase } from "@/components/customer/home-showcase";
import { ImageBannerSection } from "@/components/customer/page-hero";
import { getHotels, getPackages, getVehicles } from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { MOBILE_HOME_SHOWCASE_LIMIT } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [packages, hotels, vehicles] = await Promise.all([
    getPackages(),
    getHotels(),
    getVehicles(),
  ]);

  const featuredPackages = packages.slice(0, MOBILE_HOME_SHOWCASE_LIMIT);
  const featuredHotels = hotels.slice(0, MOBILE_HOME_SHOWCASE_LIMIT);
  const featuredVehicles = vehicles.slice(0, MOBILE_HOME_SHOWCASE_LIMIT);

  return (
    <>
      <HomeShowcase
        featuredPackages={featuredPackages}
        featuredHotels={featuredHotels}
        featuredVehicles={featuredVehicles}
      />

      <ImageBannerSection className="py-8 md:py-16" image={HERO_IMAGES.cta}>
        <div className="container mx-auto px-4 text-center">
          <AssistantIcon className="mx-auto mb-2 h-8 w-8 md:mb-4 md:h-12 md:w-12" />
          <h2 className="text-xl font-bold md:text-3xl">Ready for Your Next Adventure?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-primary-foreground/90 md:mt-4 md:text-base">
            Let our travel assistant plan the perfect trip for you, or browse our
            curated packages and book instantly.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 md:mt-8 md:gap-4">
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
