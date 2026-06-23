const REMOTE_LOGO_URLS = [
  "https://www.thesafarsathi.com/images/safarsathilogo.png",
  "https://thesafarsathi.com/images/safarsathilogo.png",
];

export interface InvoiceLogoImage {
  base64: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
}

export async function loadInvoiceLogo(): Promise<InvoiceLogoImage | null> {
  for (const url of REMOTE_LOGO_URLS) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        base64: buffer.toString("base64"),
        format: "PNG",
        width: 48,
        height: 18,
      };
    } catch {
      // try next url
    }
  }
  return null;
}
