import { demoHotels } from "@/data/demo-data";
import type { Hotel } from "@/types";

let hotelsStore: Hotel[] = [...demoHotels];

export function getPublishedHotels(): Hotel[] {
  return [...hotelsStore];
}

export function publishHotel(hotel: Hotel): Hotel {
  hotelsStore = [hotel, ...hotelsStore.filter((h) => h.id !== hotel.id)];
  return hotel;
}

export function getHotelBySlugPublished(slug: string): Hotel | null {
  return hotelsStore.find((h) => h.slug === slug) ?? null;
}

export function getAllPublishedHotelSlugs(): string[] {
  return hotelsStore.map((h) => h.slug);
}
