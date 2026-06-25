import {
  uploadAdminImageBuffer,
  isFirebaseStorageConfigured,
  type AdminUploadFolder,
} from "@/lib/firebase/admin-storage";
import { optimizeImageUrl } from "@/lib/media/image-seo-generator";

const MAX_BYTES = 5 * 1024 * 1024;

export type MirrorFolder = AdminUploadFolder;

export async function mirrorImageToFirebase(
  sourceUrl: string,
  folder: MirrorFolder,
  nameHint?: string
): Promise<string> {
  const optimized = optimizeImageUrl(sourceUrl);
  if (!isFirebaseStorageConfigured()) return optimized;
  if (
    optimized.includes("storage.googleapis.com") ||
    optimized.includes("firebasestorage.googleapis.com")
  ) {
    return optimized;
  }

  const res = await fetch(optimized, {
    headers: { "User-Agent": "SafarSathi-MediaManager/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return optimized;
  }

  let contentType = res.headers.get("content-type") ?? "image/webp";
  if (!contentType.startsWith("image/")) {
    throw new Error("URL is not an image");
  }

  const seoName = nameHint?.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-");
  if (seoName) {
    contentType = "image/webp";
  }

  return uploadAdminImageBuffer(
    buffer,
    contentType,
    folder,
    seoName ? `${seoName}.webp` : nameHint
  );
}

export async function mirrorImages(
  urls: string[],
  folder: MirrorFolder,
  nameHint?: string
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const hint = nameHint ? `${nameHint}-${i + 1}` : undefined;
    try {
      results.push(await mirrorImageToFirebase(url, folder, hint));
    } catch {
      results.push(optimizeImageUrl(url));
    }
  }
  return results;
}

export async function mirrorBlogImagePrompts(
  prompts: { url: string; fileName?: string }[],
  slug: string
): Promise<string[]> {
  const results: string[] = [];
  for (const prompt of prompts) {
    const hint = prompt.fileName?.replace(/\.webp$/, "") ?? `${slug}-${results.length + 1}`;
    try {
      results.push(await mirrorImageToFirebase(prompt.url, "blogs", hint));
    } catch {
      results.push(optimizeImageUrl(prompt.url));
    }
  }
  return results;
}
