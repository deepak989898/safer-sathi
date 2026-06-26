/**
 * Downloads correct vehicle images into public/images/vehicles/{slug}/1-6.jpg
 * Sources must match src/lib/media/vehicle-images.ts
 * Run: npm run download:vehicle-images
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, "../public/images/vehicles");

// Compiled catalog — sync with vehicle-images.ts (run build first) or use tsx:
// npx tsx scripts/download-vehicle-images.mjs
let VEHICLE_IMAGE_SOURCES = {};

try {
  const catalogPath = path.join(__dirname, "../src/lib/media/vehicle-images.ts");
  const raw = fs.readFileSync(catalogPath, "utf8");
  const match = raw.match(/export const VEHICLE_IMAGE_CATALOG[^=]*=\s*(\{[\s\S]*?\n\});\n/);
  if (match) {
    const fn = new Function(`const IMG = {}; const six = (...a) => a; return ${match[1]}`);
    VEHICLE_IMAGE_SOURCES = fn();
  }
} catch {
  /* fallback below */
}

if (Object.keys(VEHICLE_IMAGE_SOURCES).length === 0) {
  console.warn("Could not parse catalog — use runtime Unsplash URLs on deploy instead.");
  process.exit(0);
}

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
    } catch (err) {
      console.log(`fail: ${err.message}`);
    }
  }
}
console.log(`Done: ${count} images`);
