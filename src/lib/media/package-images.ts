/** Verified Unsplash URLs for package image download script. */
const U = {
  taj: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&q=85",
  fort: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&q=85",
  temple: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=85",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
  mountains: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
  car: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=85",
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=85",
  hills: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=85",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=85",
  thai: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=85",
  singapore: "https://images.unsplash.com/photo-1525621488865-1f028d7dcf87?w=1200&q=85",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=85",
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=85",
  valley: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=85",
};

function five(...urls: string[]) {
  const list = [...urls];
  while (list.length < 5) list.push(urls[list.length % urls.length]);
  return list.slice(0, 5);
}

/** Unsplash URLs (w=1200) for downloading into public/images/packages/{slug}/ */
export const PACKAGE_IMAGE_SOURCES: Record<string, string[]> = {
  "golden-triangle": five(U.taj, U.fort, U.temple, U.hotel, U.car),
  "kashmir-paradise": five(U.mountains, U.hills, U.valley, U.hotel, U.temple),
  "kerala-backwater": five(U.beach, U.hotel, U.valley, U.mountains, U.temple),
  "goa-beach": five(U.goa, U.beach, U.hotel, U.valley, U.car),
  "rajasthan-royal": five(U.fort, U.temple, U.taj, U.hotel, U.car),
  "himachal-adventure": five(U.mountains, U.car, U.hills, U.valley, U.hotel),
  "darjeeling-gangtok": five(U.hills, U.mountains, U.valley, U.beach, U.temple),
  meghalaya: five(U.mountains, U.valley, U.hills, U.beach, U.temple),
  "andaman-island": five(U.beach, U.goa, U.maldives, U.valley, U.hotel),
  "ooty-mysore": five(U.valley, U.hills, U.mountains, U.temple, U.hotel),
  "kedarnath-yatra": five(U.mountains, U.temple, U.valley, U.hills, U.car),
  "vaishno-devi": five(U.temple, U.mountains, U.hills, U.valley, U.car),
  rameshwaram: five(U.temple, U.beach, U.valley, U.hotel, U.goa),
  kanyakumari: five(U.beach, U.temple, U.goa, U.valley, U.hotel),
  lakshadweep: five(U.maldives, U.beach, U.goa, U.hotel, U.valley),
  dubai: five(U.dubai, U.hotel, U.car, U.beach, U.valley),
  thailand: five(U.thai, U.beach, U.hotel, U.bali, U.goa),
  singapore: five(U.singapore, U.dubai, U.hotel, U.beach, U.valley),
  bali: five(U.bali, U.beach, U.thai, U.maldives, U.hotel),
  "maldives-honeymoon": five(U.maldives, U.beach, U.goa, U.hotel, U.valley),
};

export function packageImagePaths(slug: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => `/images/packages/${slug}/${n}.jpg`);
}
