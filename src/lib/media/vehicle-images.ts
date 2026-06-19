const U = {
  sedan: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85",
  suv: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=85",
  luxury: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=85",
  innova: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1200&q=85",
  bus: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=85",
  tempo: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1200&q=85",
  sports: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=85",
  interior: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
};

function five(...urls: string[]) {
  const list = [...urls];
  while (list.length < 5) list.push(urls[list.length % urls.length]);
  return list.slice(0, 5);
}

/** Unsplash sources for scripts/download-vehicle-images.mjs */
export const VEHICLE_IMAGE_SOURCES: Record<string, string[]> = {
  "toyota-innova-crysta": five(U.innova, U.suv, U.interior, U.sedan, U.suv),
  "toyota-fortuner": five(U.suv, U.innova, U.interior, U.suv, U.sedan),
  "mahindra-scorpio-n": five(U.suv, U.suv, U.interior, U.innova, U.sedan),
  "mahindra-xuv700": five(U.suv, U.interior, U.innova, U.suv, U.sedan),
  "maruti-ertiga": five(U.innova, U.suv, U.interior, U.sedan, U.suv),
  "kia-carens": five(U.suv, U.innova, U.interior, U.sedan, U.suv),
  "toyota-rumion": five(U.innova, U.suv, U.interior, U.sedan, U.suv),
  "hyundai-creta": five(U.suv, U.sedan, U.interior, U.suv, U.sports),
  "honda-city": five(U.sedan, U.interior, U.sedan, U.suv, U.sports),
  "maruti-dzire": five(U.sedan, U.interior, U.sedan, U.suv, U.sports),
  "hyundai-verna": five(U.sedan, U.interior, U.sedan, U.sports, U.suv),
  "toyota-camry": five(U.luxury, U.sedan, U.interior, U.luxury, U.sports),
  "bmw-5-series": five(U.luxury, U.sports, U.interior, U.luxury, U.sedan),
  "mercedes-c-class": five(U.luxury, U.sports, U.interior, U.luxury, U.sedan),
  "audi-a6": five(U.luxury, U.sports, U.interior, U.luxury, U.sedan),
  "tempo-traveller-12": five(U.tempo, U.bus, U.innova, U.interior, U.suv),
  "tempo-traveller-17": five(U.tempo, U.bus, U.innova, U.interior, U.suv),
  "force-urbania": five(U.tempo, U.bus, U.innova, U.interior, U.suv),
  "mini-bus-20": five(U.bus, U.tempo, U.innova, U.interior, U.suv),
  "volvo-bus-45": five(U.bus, U.bus, U.tempo, U.interior, U.suv),
  "maruti-swift": five(U.sedan, U.sports, U.interior, U.sedan, U.suv),
  "maruti-baleno": five(U.sedan, U.sports, U.interior, U.sedan, U.suv),
  "hyundai-i20": five(U.sedan, U.sports, U.interior, U.sedan, U.suv),
  "kia-sonet": five(U.suv, U.sedan, U.interior, U.sports, U.suv),
  "mahindra-thar": five(U.suv, U.sports, U.interior, U.suv, U.sedan),
  "toyota-hycross": five(U.innova, U.suv, U.interior, U.sedan, U.suv),
  "bmw-x1": five(U.luxury, U.suv, U.interior, U.luxury, U.sports),
  "mercedes-glc": five(U.luxury, U.suv, U.interior, U.luxury, U.sports),
  "audi-q7": five(U.luxury, U.suv, U.interior, U.luxury, U.sports),
  "range-rover-velar": five(U.luxury, U.suv, U.interior, U.luxury, U.sports),
};

export function vehicleImagePaths(slug: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => `/images/vehicles/${slug}/${n}.jpg`);
}
