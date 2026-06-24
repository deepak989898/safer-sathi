"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";

const galleryImages = {
  all: [
    { src: TRAVEL_IMAGES.goldenTriangle, alt: "Heritage Tour" },
    { src: TRAVEL_IMAGES.keralaBackwaters, alt: "Kerala Backwaters" },
    { src: TRAVEL_IMAGES.charDham, alt: "Mountains" },
    { src: TRAVEL_IMAGES.hotelLuxury, alt: "Luxury Hotel" },
    { src: TRAVEL_IMAGES.beachResort, alt: "Goa Beach" },
    { src: TRAVEL_IMAGES.hotelLake, alt: "Udaipur Lake" },
    { src: TRAVEL_IMAGES.manaliAdventure, alt: "Adventure SUV" },
    { src: TRAVEL_IMAGES.bus, alt: "Travel Bus" },
  ],
  destinations: [
    { src: TRAVEL_IMAGES.goldenTriangle, alt: "Heritage Tour" },
    { src: TRAVEL_IMAGES.keralaBackwaters, alt: "Kerala" },
    { src: TRAVEL_IMAGES.charDham, alt: "Himalayas" },
  ],
  hotels: [
    { src: TRAVEL_IMAGES.hotelLuxury, alt: "Luxury Hotel" },
    { src: TRAVEL_IMAGES.hotelLake, alt: "Udaipur" },
  ],
  experiences: [
    { src: TRAVEL_IMAGES.beachResort, alt: "Goa Beach" },
    { src: TRAVEL_IMAGES.manaliAdventure, alt: "Adventure" },
  ],
};

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <section className="container mx-auto px-4 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
          </TabsList>

          {Object.keys(galleryImages).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {galleryImages[tab as keyof typeof galleryImages].map((img) => (
                  <button
                    key={`${tab}-${img.alt}`}
                    type="button"
                    onClick={() => setLightbox(img.src)}
                    className="group relative aspect-square overflow-hidden rounded-xl"
                  >
                    <SafeImage
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/20" />
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Gallery"
              className="max-h-[90vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
