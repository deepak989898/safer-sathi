import fs from "fs";
import path from "path";
import { appUrl } from "@/lib/site-config";

const REMOTE_LOGO_URLS = [
  () => appUrl("/images/safarsathilogo.png"),
  "https://www.thesafarsathi.com/images/safarsathilogo.png",
  "https://thesafarsathi.com/images/safarsathilogo.png",
];

export interface InvoiceLogoImage {
  base64: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
}

function fromBuffer(buffer: Buffer): InvoiceLogoImage {
  return {
    base64: buffer.toString("base64"),
    format: "PNG",
    width: 52,
    height: 20,
  };
}

async function fetchLogo(url: string): Promise<InvoiceLogoImage | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return fromBuffer(buffer);
  } catch {
    return null;
  }
}

export async function loadInvoiceLogo(): Promise<InvoiceLogoImage | null> {
  const localPath = path.join(process.cwd(), "public", "images", "safarsathilogo.png");
  try {
    if (fs.existsSync(localPath)) {
      return fromBuffer(fs.readFileSync(localPath));
    }
  } catch {
    // try remote
  }

  for (const entry of REMOTE_LOGO_URLS) {
    const url = typeof entry === "function" ? entry() : entry;
    const logo = await fetchLogo(url);
    if (logo) return logo;
  }

  return null;
}
