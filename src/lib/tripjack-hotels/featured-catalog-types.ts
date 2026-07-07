export interface FeaturedTripJackHotelCard {
  tjHotelId: number;
  name: string;
  cityName: string;
  cityKey: string;
  locality?: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  imageCaption?: string;
  facilities: string[];
}
