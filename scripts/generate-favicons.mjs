import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG_PATH = path.join(ROOT, "public/images/favicon.svg");

const outputs = [
  { size: 32, file: "public/favicon.ico" },
  { size: 48, file: "public/images/favicon-48.png" },
  { size: 180, file: "public/apple-touch-icon.png" },
  { size: 192, file: "public/images/favicon-192.png" },
  { size: 512, file: "public/favicon.png" },
  { size: 512, file: "public/images/favicon.png" },
];

async function generatePng(size, outPath) {
  const svg = fs.readFileSync(SVG_PATH);

  await sharp(svg)
    .resize(size, size, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(ROOT, outPath));
}

async function main() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`Missing source favicon: ${SVG_PATH}`);
  }

  for (const { size, file } of outputs) {
    await generatePng(size, file);
    console.log(`wrote ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
