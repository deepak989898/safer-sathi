/**
 * Downloads HD package images into public/images/packages/{slug}/1-5.jpg
 * Run: node scripts/download-package-images.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, "../public/images/packages");

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

const PACKAGE_IMAGE_SOURCES = {
  "golden-triangle": [U.taj, U.fort, U.temple, U.hotel, U.car],
  "kashmir-paradise": [U.mountains, U.hills, U.valley, U.hotel, U.temple],
  "kerala-backwater": [U.beach, U.hotel, U.valley, U.mountains, U.temple],
  "goa-beach": [U.goa, U.beach, U.hotel, U.valley, U.car],
  "rajasthan-royal": [U.fort, U.temple, U.taj, U.hotel, U.car],
  "himachal-adventure": [U.mountains, U.car, U.hills, U.valley, U.hotel],
  "darjeeling-gangtok": [U.hills, U.mountains, U.valley, U.beach, U.temple],
  meghalaya: [U.mountains, U.valley, U.hills, U.beach, U.temple],
  "andaman-island": [U.beach, U.goa, U.maldives, U.valley, U.hotel],
  "ooty-mysore": [U.valley, U.hills, U.mountains, U.temple, U.hotel],
  "kedarnath-yatra": [U.mountains, U.temple, U.valley, U.hills, U.car],
  "vaishno-devi": [U.temple, U.mountains, U.hills, U.valley, U.car],
  rameshwaram: [U.temple, U.beach, U.valley, U.hotel, U.goa],
  kanyakumari: [U.beach, U.temple, U.goa, U.valley, U.hotel],
  lakshadweep: [U.maldives, U.beach, U.goa, U.hotel, U.valley],
  dubai: [U.dubai, U.hotel, U.car, U.beach, U.valley],
  thailand: [U.thai, U.beach, U.hotel, U.bali, U.goa],
  singapore: [U.singapore, U.dubai, U.hotel, U.beach, U.valley],
  bali: [U.bali, U.beach, U.thai, U.maldives, U.hotel],
  "maldives-honeymoon": [U.maldives, U.beach, U.goa, U.hotel, U.valley],
};

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

let count = 0;
for (const [slug, urls] of Object.entries(PACKAGE_IMAGE_SOURCES)) {
  const dir = path.join(publicRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < urls.length; i++) {
    const dest = path.join(dir, `${i + 1}.jpg`);
    process.stdout.write(`${slug}/${i + 1}.jpg `);
    try {
      await download(urls[i], dest);
      console.log("ok");
      count++;
    } catch {
      await download(U.hotel, dest);
      console.log("fallback");
      count++;
    }
  }
}
console.log(`Done: ${count} images`);
