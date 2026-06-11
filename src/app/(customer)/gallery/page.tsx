"use client";

import { useState } from "react";
import Image from "next/image";
import { PageHero } from "@/components/customer/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const galleryImages = {
  all: [
    { src: "https://images.unsplash.com/photo-1524492412937-280b457d55e8?w=600&q=80", alt: "Taj Mahal" },
    { src: "https://images.unsplash.com/photo-1602216057656-f1031b5a934f?w=600&q=80", alt: "Kerala Backwaters" },
    { src: "https://images.unsplash.com/photo-1626621341517-bbf3d69bfc9b?w=600&q=80", alt: "Mountains" },
    { src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80", alt: "Luxury Hotel" },
    { src: "https://images.unsplash.com/photo-1571003123894-1f0594d2b493?w=600&q=80", alt: "Goa Beach" },
    { src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80", alt: "Udaipur Lake" },
    { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", alt: "Himalayas" },
    { src: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80", alt: "Travel" },
  ],
  destinations: [
    { src: "https://images.unsplash.com/photo-1524492412937-280b457d55e8?w=600&q=80", alt: "Taj Mahal" },
    { src: "https://images.unsplash.com/photo-1602216057656-f1031b5a934f?w=600&q=80", alt: "Kerala" },
    { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", alt: "Himalayas" },
  ],
  hotels: [
    { src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80", alt: "Luxury Hotel" },
    { src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80", alt: "Udaipur" },
  ],
  experiences: [
    { src: "https://images.unsplash.com/photo-1571003123894-1f0594d2b493?w=600&q=80", alt: "Goa Beach" },
    { src: "https://images.unsplash.com/photo-1626621341517-bbf3d69bfc9b?w=600&q=80", alt: "Adventure" },
  ],
};

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <PageHero
        title="Gallery"
        subtitle="Moments captured from journeys across India"
        image="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80"
      />

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
                    key={img.src}
                    type="button"
                    onClick={() => setLightbox(img.src)}
                    className="group relative aspect-square overflow-hidden rounded-xl"
                  >
                    <Image
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
