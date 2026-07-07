import assert from "node:assert/strict";
import {
  parseTripJackHotelImages,
  pickHrefFromImageLinks,
  resolveHotelCardImageUrl,
} from "../src/lib/tripjack-hotels/hotel-images";
import type { NormalizedHotel } from "../src/lib/tripjack-hotels/types";

const sampleLinks = {
  original: { href: "https://i.travelapi.com/original.jpg" },
  "350px": { href: "https://i.travelapi.com/350.jpg" },
};

assert.equal(pickHrefFromImageLinks(sampleLinks), "https://i.travelapi.com/original.jpg");

const sampleImages = [
  {
    caption: "Pool",
    is_hero_image: false,
    category: "pool",
    links: { "500px": { href: "https://i.travelapi.com/pool-500.jpg" } },
  },
  {
    caption: "Exterior",
    is_hero_image: true,
    category: "exterior",
    links: sampleLinks,
  },
];

const parsed = parseTripJackHotelImages(sampleImages);
assert.equal(parsed.heroImage, "https://i.travelapi.com/original.jpg");
assert.equal(parsed.imageCaption, "Exterior");
assert.equal(parsed.imageUrls.length, 2);

const hotel: NormalizedHotel = {
  tjHotelId: 1,
  name: "Test",
  images: sampleImages,
  cheapestTotalPrice: 100,
  cheapestBasePrice: 80,
  cheapestTaxes: 20,
  cheapestMf: 0,
  cheapestMft: 0,
  currency: "INR",
  mealBasis: "RO",
  inclusions: [],
  isRefundable: false,
  panRequired: false,
  passportRequired: false,
  options: [],
  cheapestOption: null,
};

assert.equal(resolveHotelCardImageUrl(hotel), "https://i.travelapi.com/original.jpg");

console.log("hotel-images parsing tests passed");
