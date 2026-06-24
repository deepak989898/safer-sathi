import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");

const outputs = [
  { size: 512, file: "public/favicon.png" },
  { size: 512, file: "public/images/favicon.png" },
  { size: 192, file: "public/images/favicon-192.png" },
  { size: 180, file: "public/apple-touch-icon.png" },
];

async function generatePng(size, outPath) {
  const svgPath = path.join(ROOT, "public/images/favicon.svg");
  const svg = fs.readFileSync(svgPath);

  await sharp(svg)
    .resize(size, size, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(ROOT, outPath));
}

async function main() {
  for (const { size, file } of outputs) {
    await generatePng(size, file);
    console.log(`wrote ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
