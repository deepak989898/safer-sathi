import { requireStaffAuth } from "@/lib/admin/api-auth";
import {
  isFirebaseStorageConfigured,
  uploadAdminImageBuffer,
  type AdminUploadFolder,
} from "@/lib/firebase/admin-storage";
import { apiError, apiSuccess } from "@/lib/api-response";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const FOLDERS = new Set<AdminUploadFolder>(["packages", "hotels", "vehicles", "blogs"]);

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    if (!isFirebaseStorageConfigured()) {
      return apiError(
        "Image upload is not configured. Add FIREBASE_STORAGE_BUCKET and Firebase Admin credentials.",
        503
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (typeof folder !== "string" || !FOLDERS.has(folder as AdminUploadFolder)) {
      return apiError("Invalid upload folder", 400);
    }

    if (!(file instanceof File)) {
      return apiError("No image file provided", 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("Only JPG, PNG, WebP, and GIF images are allowed", 400);
    }

    if (file.size > MAX_BYTES) {
      return apiError("Image is too large (max 5 MB after compression)", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadAdminImageBuffer(
      buffer,
      file.type,
      folder as AdminUploadFolder,
      file.name
    );

    return apiSuccess({ url });
  } catch (err) {
    console.error("Admin image upload error:", err);
    return apiError(err instanceof Error ? err.message : "Image upload failed", 500);
  }
}
