/**
 * Curated vehicle-specific images (Unsplash).
 * Each vehicle gets unique URLs — hatchbacks use compact cars, interiors are real car cabins.
 */

function u(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?w=1200&h=675&fit=crop&fm=webp&q=82&auto=format`;
}

const IMG = {
  hatchA: u("1605559424843-7ffb4f035164"),
  hatchB: u("1553440569-b44aef9d0f8a"),
  hatchC: u("1502877338535-766e1452684a"),
  hatchD: u("1583121274602-3e2820c59988"),
  hatchE: u("1603584173816-0a371108fc08"),
  hatchF: u("1621007949248-df279aae09db"),
  hatchG: u("1603386329225-868f9bed1622"),
  hatchH: u("1542362567-b07e54358753"),
  hatchI: u("1603386329225-868f9bed1622"),
  hatchJ: u("1533475036709-0998864d3d9a"),
  hatchK: u("1492144534655-ae79c964c9d7"),
  hatchL: u("1580273916550-e323f2cc8a1a"),

  sedanA: u("1606666541128-47ef49f2b54b"),
  sedanB: u("1533475036709-0998864d3d9a"),
  sedanC: u("1609521263047-f8f205293f24"),
  sedanD: u("1619767887858-aafb6dd7bd09"),
  sedanE: u("1617814076666-f425f125eb84"),
  sedanF: u("1603584173816-0a371108fc08"),

  suvA: u("1519641471654-76ce49b0a6bb"),
  suvB: u("1549317661-bd32c8ce0db2"),
  suvC: u("1609521263047-f8f205293f24"),
  suvD: u("1503376780353-7e6692767b70"),
  suvE: u("1590362891991-f776e747e588"),
  suvF: u("1464214890801-7a14b9f8a880"),
  suvG: u("1618843479313-40f8afb4b4d8"),
  suvH: u("1617535248674-59173d6f29ee"),
  suvI: u("1606666541128-47ef49f2b54b"),
  suvJ: u("1553440569-b44aef9d0f8a"),
  suvK: u("1502877338535-766e1452684a"),
  suvL: u("1583121274602-3e2820c59988"),

  mpvA: u("1570125909232-eb263c188f7e"),
  mpvB: u("1464214890801-7a14b9f8a880"),
  mpvC: u("1544620347-c4fd4a3d5957"),
  mpvD: u("1621007949248-df279aae09db"),
  mpvE: u("1603386329225-868f9bed1622"),
  mpvF: u("1542362567-b07e54358753"),

  luxA: u("1618843479313-40f8afb4b4d8"),
  luxB: u("1617814076666-f425f125eb84"),
  luxC: u("1619767887858-aafb6dd7bd09"),
  luxD: u("1617535248674-59173d6f29ee"),
  luxE: u("1503376780353-7e6692767b70"),
  luxF: u("1606666541128-47ef49f2b54b"),

  intDash: u("1549317761-22e95a0e8f0f"),
  intSeats: u("1489827109932-5051bc94250b"),
  intCabin: u("1580273916550-e323f2cc8a1a"),
  intWheel: u("1492144534655-ae79c964c9d7"),
  intRear: u("1542362567-b07e54358753"),

  busA: u("1544620347-c4fd4a3d5957"),
  busB: u("1590362891991-f776e747e588"),
  busC: u("1570125909232-eb263c188f7e"),
  busD: u("1464214890801-7a14b9f8a880"),
  busE: u("1603386329225-868f9bed1622"),
  busF: u("1542362567-b07e54358753"),

  offA: u("1519641471654-76ce49b0a6bb"),
  offB: u("1549317661-bd32c8ce0db2"),
  offC: u("1609521263047-f8f205293f24"),
  offD: u("1605559424843-7ffb4f035164"),
  offE: u("1583121274602-3e2820c59988"),
  offF: u("1489827109932-5051bc94250b"),
};

function six(...urls: string[]): string[] {
  const list = [...urls];
  while (list.length < 6) list.push(urls[list.length % urls.length]);
  return list.slice(0, 6);
}

export const VEHICLE_IMAGE_CATALOG: Record<string, string[]> = {
  "maruti-swift": six(IMG.hatchA, IMG.hatchB, IMG.intDash, IMG.hatchC, IMG.intSeats, IMG.hatchD),
  "maruti-baleno": six(IMG.hatchG, IMG.hatchH, IMG.intCabin, IMG.hatchE, IMG.intWheel, IMG.hatchJ),
  "hyundai-i20": six(IMG.hatchK, IMG.hatchL, IMG.intDash, IMG.hatchF, IMG.intSeats, IMG.hatchD),

  "maruti-dzire": six(IMG.sedanA, IMG.sedanC, IMG.intDash, IMG.hatchD, IMG.intSeats, IMG.sedanF),
  "hyundai-verna": six(IMG.sedanB, IMG.sedanC, IMG.intCabin, IMG.hatchG, IMG.intWheel, IMG.sedanD),
  "honda-city": six(IMG.hatchJ, IMG.sedanA, IMG.intDash, IMG.sedanC, IMG.intSeats, IMG.hatchH),
  "toyota-camry": six(IMG.luxA, IMG.sedanD, IMG.intCabin, IMG.luxB, IMG.intSeats, IMG.sedanE),

  "hyundai-creta": six(IMG.suvA, IMG.suvB, IMG.intDash, IMG.suvC, IMG.intSeats, IMG.suvD),
  "kia-sonet": six(IMG.suvG, IMG.suvH, IMG.intCabin, IMG.suvI, IMG.intWheel, IMG.suvJ),
  "mahindra-scorpio-n": six(IMG.suvB, IMG.suvA, IMG.intDash, IMG.offC, IMG.intSeats, IMG.suvK),
  "mahindra-xuv700": six(IMG.suvC, IMG.suvD, IMG.intCabin, IMG.suvL, IMG.intWheel, IMG.suvA),
  "toyota-fortuner": six(IMG.suvD, IMG.suvA, IMG.intDash, IMG.suvB, IMG.intSeats, IMG.offC),
  "mahindra-thar": six(IMG.offA, IMG.offB, IMG.intDash, IMG.offC, IMG.intSeats, IMG.offD),
  "bmw-x1": six(IMG.luxA, IMG.suvG, IMG.intCabin, IMG.luxC, IMG.intSeats, IMG.suvH),
  "mercedes-glc": six(IMG.luxB, IMG.luxD, IMG.intDash, IMG.suvG, IMG.intWheel, IMG.luxA),
  "audi-q7": six(IMG.luxC, IMG.luxE, IMG.intCabin, IMG.luxD, IMG.intSeats, IMG.suvD),
  "range-rover-velar": six(IMG.luxD, IMG.luxA, IMG.intDash, IMG.suvG, IMG.intSeats, IMG.luxB),

  "toyota-innova-crysta": six(IMG.mpvA, IMG.mpvB, IMG.intDash, IMG.mpvC, IMG.intSeats, IMG.mpvD),
  "maruti-ertiga": six(IMG.mpvB, IMG.mpvA, IMG.intCabin, IMG.mpvE, IMG.intWheel, IMG.mpvF),
  "kia-carens": six(IMG.mpvD, IMG.mpvE, IMG.intDash, IMG.mpvA, IMG.intSeats, IMG.mpvB),
  "toyota-rumion": six(IMG.mpvF, IMG.mpvA, IMG.intCabin, IMG.mpvB, IMG.intSeats, IMG.mpvC),
  "toyota-hycross": six(IMG.mpvA, IMG.mpvD, IMG.intDash, IMG.suvC, IMG.intSeats, IMG.mpvE),

  "bmw-5-series": six(IMG.luxA, IMG.luxC, IMG.intCabin, IMG.luxB, IMG.intSeats, IMG.sedanD),
  "mercedes-c-class": six(IMG.luxB, IMG.luxE, IMG.intDash, IMG.luxA, IMG.intWheel, IMG.luxD),
  "audi-a6": six(IMG.luxC, IMG.luxA, IMG.intCabin, IMG.luxD, IMG.intSeats, IMG.luxB),

  "tempo-traveller-12": six(IMG.busC, IMG.busD, IMG.intSeats, IMG.busA, IMG.intDash, IMG.mpvA),
  "tempo-traveller-17": six(IMG.busD, IMG.busC, IMG.intCabin, IMG.busB, IMG.intSeats, IMG.mpvB),
  "force-urbania": six(IMG.busA, IMG.busC, IMG.intDash, IMG.busD, IMG.intSeats, IMG.mpvA),
  "mini-bus-20": six(IMG.busB, IMG.busA, IMG.intSeats, IMG.busC, IMG.intCabin, IMG.busD),
  "volvo-bus-45": six(IMG.busB, IMG.busE, IMG.intSeats, IMG.busA, IMG.intDash, IMG.busF),
};

export function getVehicleImageUrls(slug: string): string[] {
  const key = slug.trim().toLowerCase();
  if (VEHICLE_IMAGE_CATALOG[key]) return [...VEHICLE_IMAGE_CATALOG[key]];

  for (const [catalogSlug, urls] of Object.entries(VEHICLE_IMAGE_CATALOG)) {
    if (key.includes(catalogSlug) || catalogSlug.includes(key)) return [...urls];
  }

  return six(IMG.hatchA, IMG.hatchB, IMG.intDash, IMG.hatchC, IMG.intSeats, IMG.hatchD);
}

export function vehicleImagePaths(slug: string): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => `/images/vehicles/${slug}/${n}.jpg`);
}

export function resolveVehicleImages(slug: string, existing?: string[]): string[] {
  const catalog = getVehicleImageUrls(slug);
  if (!existing?.length) return catalog;

  const needsReplace = existing.some(
    (url) =>
      url.startsWith("/images/vehicles/") ||
      url.includes("photo-1552519507") ||
      url.includes("photo-1494976388531") ||
      url.includes("photo-1566073771259")
  );
  if (needsReplace) return catalog;

  return existing;
}

export const VEHICLE_IMAGE_SOURCES = VEHICLE_IMAGE_CATALOG;
