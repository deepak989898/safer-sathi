/**
 * Downloads HD vehicle images into public/images/vehicles/{slug}/1-5.jpg
 * Run: npm run download:vehicle-images
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, "../public/images/vehicles");

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

const VEHICLE_IMAGE_SOURCES = {
  "toyota-innova-crysta": [U.innova, U.suv, U.interior, U.sedan, U.suv],
  "toyota-fortuner": [U.suv, U.innova, U.interior, U.suv, U.sedan],
  "mahindra-scorpio-n": [U.suv, U.suv, U.interior, U.innova, U.sedan],
  "mahindra-xuv700": [U.suv, U.interior, U.innova, U.suv, U.sedan],
  "maruti-ertiga": [U.innova, U.suv, U.interior, U.sedan, U.suv],
  "kia-carens": [U.suv, U.innova, U.interior, U.sedan, U.suv],
  "toyota-rumion": [U.innova, U.suv, U.interior, U.sedan, U.suv],
  "hyundai-creta": [U.suv, U.sedan, U.interior, U.suv, U.sports],
  "honda-city": [U.sedan, U.interior, U.sedan, U.suv, U.sports],
  "maruti-dzire": [U.sedan, U.interior, U.sedan, U.suv, U.sports],
  "hyundai-verna": [U.sedan, U.interior, U.sedan, U.sports, U.suv],
  "toyota-camry": [U.luxury, U.sedan, U.interior, U.luxury, U.sports],
  "bmw-5-series": [U.luxury, U.sports, U.interior, U.luxury, U.sedan],
  "mercedes-c-class": [U.luxury, U.sports, U.interior, U.luxury, U.sedan],
  "audi-a6": [U.luxury, U.sports, U.interior, U.luxury, U.sedan],
  "tempo-traveller-12": [U.tempo, U.bus, U.innova, U.interior, U.suv],
  "tempo-traveller-17": [U.tempo, U.bus, U.innova, U.interior, U.suv],
  "force-urbania": [U.tempo, U.bus, U.innova, U.interior, U.suv],
  "mini-bus-20": [U.bus, U.tempo, U.innova, U.interior, U.suv],
  "volvo-bus-45": [U.bus, U.bus, U.tempo, U.interior, U.suv],
  "maruti-swift": [U.sedan, U.sports, U.interior, U.sedan, U.suv],
  "maruti-baleno": [U.sedan, U.sports, U.interior, U.sedan, U.suv],
  "hyundai-i20": [U.sedan, U.sports, U.interior, U.sedan, U.suv],
  "kia-sonet": [U.suv, U.sedan, U.interior, U.sports, U.suv],
  "mahindra-thar": [U.suv, U.sports, U.interior, U.suv, U.sedan],
  "toyota-hycross": [U.innova, U.suv, U.interior, U.sedan, U.suv],
  "bmw-x1": [U.luxury, U.suv, U.interior, U.luxury, U.sports],
  "mercedes-glc": [U.luxury, U.suv, U.interior, U.luxury, U.sports],
  "audi-q7": [U.luxury, U.suv, U.interior, U.luxury, U.sports],
  "range-rover-velar": [U.luxury, U.suv, U.interior, U.luxury, U.sports],
};

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

let count = 0;
for (const [slug, urls] of Object.entries(VEHICLE_IMAGE_SOURCES)) {
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
      await download(U.interior, dest);
      console.log("fallback");
      count++;
    }
  }
}
console.log(`Done: ${count} images`);
