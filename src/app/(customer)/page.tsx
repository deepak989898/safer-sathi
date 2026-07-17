import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TryAssistantButton } from "@/components/ai/try-assistant-button";
import { HomeShowcase } from "@/components/customer/home-showcase";
import { ImageBannerSection } from "@/components/customer/page-hero";
import { getHotels, getPackages, getReviews, getVehicles } from "@/lib/data-service";
import {
  buildHomepageHotels,
  buildHomepagePackages,
  buildHomepageVehicles,
  buildPopularDestinations,
  toMobileHotelItems,
  toMobilePackageItems,
  toMobileVehicleItems,
} from "@/lib/catalog/homepage-showcase";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { MobileFeatureCard } from "@/components/customer/mobile-home-hero";
import { MobileTravelersSlider } from "@/components/customer/mobile-travelers-slider";

// Public homepage content changes infrequently. ISR keeps it available from
// Vercel's cache instead of running four Firestore reads on every page view.
export const revalidate = 300;

export default async function HomePage() {
  const [packages, hotels, vehicles, reviews] = await Promise.all([
    getPackages(),
    getHotels(),
    getVehicles(),
    getReviews(),
  ]);

  const featuredPackages = buildHomepagePackages(packages);
  const featuredHotels = buildHomepageHotels(hotels);
  const featuredVehicles = buildHomepageVehicles(vehicles);
  const popularDestinations = buildPopularDestinations(packages);

  const mobilePackages = toMobilePackageItems(packages);
  const mobileHotels = toMobileHotelItems(hotels);
  const mobileVehicles = toMobileVehicleItems(vehicles);

  return (
    <>
      <HomeShowcase
        popularDestinations={popularDestinations}
        featuredPackages={featuredPackages}
        featuredHotels={featuredHotels}
        featuredVehicles={featuredVehicles}
        mobilePackages={mobilePackages}
        mobileHotels={mobileHotels}
        mobileVehicles={mobileVehicles}
        reviews={reviews}
      />

      <div className="container mx-auto px-4 pb-5 md:hidden">
        <MobileFeatureCard />
      </div>

      <MobileTravelersSlider reviews={reviews} />

      <ImageBannerSection className="py-5 pb-6 md:hidden md:py-12" image={HERO_IMAGES.cta}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-lg font-bold md:text-3xl">Ready for Your Next Adventure?</h2>
          <p className="mx-auto mt-1.5 max-w-xl text-xs text-primary-foreground/90 md:mt-3 md:text-base">
            Let our travel assistant plan the perfect trip for you, or browse our
            curated packages and book instantly.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 md:mt-6 md:gap-4">
            <TryAssistantButton variant="secondary" showIcon />
            <Link href="/packages">
              <Button
                size="default"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 md:size-lg"
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
