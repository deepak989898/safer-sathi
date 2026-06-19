/**
 * Downloads HD hotel images — run: npm run download:hotel-images
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, "../public/images/hotels");

const U = {
  luxury: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=85",
  pool: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=85",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
  palace: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=85",
  resort: "https://images.unsplash.com/photo-1611892440504-42a9849d1fc5?w=1200&q=85",
  room: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=85",
  maldives: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=85",
};

const SLUGS = [
  "taj-palace-delhi", "leela-palace-delhi", "itc-maurya-delhi", "radisson-blu-dwarka", "the-park-delhi",
  "taj-view-agra", "crystal-sarovar-agra", "grand-mercure-agra",
  "raj-palace-jaipur", "rambagh-palace-jaipur", "trident-jaipur", "hilton-jaipur",
  "taj-lake-palace", "oberoi-udaivilas", "trident-udaipur",
  "umaid-bhawan-jodhpur", "radisson-jodhpur",
  "suryagarh-jaisalmer", "desert-tulip-jaisalmer",
  "taj-fort-aguada", "grand-hyatt-goa", "planet-hollywood-goa", "novotel-goa", "hard-rock-goa",
  "kumarakom-lake-resort", "spice-village-thekkady", "fragrant-nature-kochi", "blanket-hotel-munnar",
  "taj-mahal-palace-mumbai", "oberoi-mumbai", "trident-nariman-point", "jw-marriott-mumbai",
  "leela-bangalore", "itc-gardenia-bangalore", "taj-mg-road-bangalore",
  "wildflower-hall-shimla", "radisson-shimla", "clarkes-hotel-shimla",
  "manuallaya-resort-manali", "the-himalayan-manali", "apple-country-resort-manali",
  "mayfair-darjeeling", "summit-swiss-heritage",
  "elgin-nor-khill", "summit-golden-crescent",
  "lalit-grand-palace-srinagar", "vivanta-dal-view", "houseboat-royal-group",
  "seashell-resort-andaman", "symphony-samudra",
  "savoy-ihcl-ooty", "fortune-resort-ooty",
  "sparsa-resort-kanyakumari", "sea-view-hotel-kanyakumari",
  "daiwik-hotel-rameshwaram", "hyatt-place-rameshwaram",
  "atlantis-dubai", "marina-bay-sands-singapore", "hard-rock-bali", "sun-siyam-maldives",
];

function urlsFor(slug) {
  if (slug.includes("goa") || slug.includes("andaman") || slug.includes("maldives") || slug.includes("bali")) {
    return [U.beach, U.resort, U.pool, U.luxury, U.room];
  }
  if (slug.includes("dubai") || slug.includes("singapore")) {
    return [U.dubai, U.luxury, U.pool, U.room, U.resort];
  }
  if (slug.includes("palace") || slug.includes("oberoi") || slug.includes("umaid") || slug.includes("rambagh")) {
    return [U.palace, U.luxury, U.pool, U.room, U.resort];
  }
  if (slug.includes("houseboat") || slug.includes("kumarakom") || slug.includes("lake")) {
    return [U.resort, U.beach, U.room, U.luxury, U.pool];
  }
  return [U.luxury, U.room, U.pool, U.resort, U.palace];
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

let count = 0;
for (const slug of SLUGS) {
  const dir = path.join(publicRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  const urls = urlsFor(slug);
  for (let i = 0; i < 5; i++) {
    const dest = path.join(dir, `${i + 1}.jpg`);
    process.stdout.write(`${slug}/${i + 1}.jpg `);
    try {
      await download(urls[i], dest);
      console.log("ok");
      count++;
    } catch {
      await download(U.luxury, dest);
      console.log("fallback");
      count++;
    }
  }
}
console.log(`Done: ${count} images`);
