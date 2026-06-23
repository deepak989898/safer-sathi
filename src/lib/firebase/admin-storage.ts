import { getStorage } from "firebase-admin/storage";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin-app";

export type AdminUploadFolder = "packages" | "hotels" | "vehicles" | "blogs";

export function isFirebaseStorageConfigured(): boolean {
  return isAdminConfigured() && Boolean(process.env.FIREBASE_STORAGE_BUCKET);
}

export async function uploadAdminImageBuffer(
  buffer: Buffer,
  contentType: string,
  folder: AdminUploadFolder,
  originalName?: string
): Promise<string> {
  if (!isFirebaseStorageConfigured()) {
    throw new Error(
      "Firebase Storage is not configured. Set FIREBASE_STORAGE_BUCKET and admin credentials in Vercel env."
    );
  }

  const ext =
    contentType === "image/webp"
      ? "webp"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/jpeg"
          ? "jpg"
          : "img";

  const safeStem = (originalName ?? "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 48) || "image";

  const objectPath = `admin-uploads/${folder}/${Date.now()}-${safeStem}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const bucket = getStorage(getAdminApp()).bucket();
  const file = bucket.file(objectPath);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    resumable: false,
  });

  try {
    await file.makePublic();
  } catch {
    // Bucket may use uniform access — public URL still works when rules allow read.
  }

  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}
