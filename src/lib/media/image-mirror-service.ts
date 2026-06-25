import { uploadAdminImageBuffer, isFirebaseStorageConfigured } from "@/lib/firebase/admin-storage";

const MAX_BYTES = 5 * 1024 * 1024;

export async function mirrorImageToFirebase(
  sourceUrl: string,
  folder: "blogs" | "packages" | "hotels" | "vehicles",
  nameHint?: string
): Promise<string> {
  if (!isFirebaseStorageConfigured()) return sourceUrl;
  if (sourceUrl.includes("storage.googleapis.com") || sourceUrl.includes("firebasestorage.googleapis.com")) {
    return sourceUrl;
  }

  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "SafarSathi-MediaManager/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return sourceUrl;
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("URL is not an image");
  }

  return uploadAdminImageBuffer(buffer, contentType, folder, nameHint);
}

export async function mirrorImages(
  urls: string[],
  folder: "blogs" | "packages" | "hotels" | "vehicles",
  nameHint?: string
): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    try {
      results.push(await mirrorImageToFirebase(url, folder, nameHint));
    } catch {
      results.push(url);
    }
  }
  return results;
}
