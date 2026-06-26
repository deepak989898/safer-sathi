import { adminApiFetch } from "@/lib/admin/api-client";
import { compressImageFile } from "@/lib/image-compress";
import type { AdminUploadFolder } from "@/lib/firebase/admin-storage";

export async function uploadAdminImageFile(
  file: File,
  folder: AdminUploadFolder
): Promise<string> {
  const compressed = await compressImageFile(file);

  const formData = new FormData();
  formData.append("file", compressed, compressed.name);
  formData.append("folder", folder);

  const res = await adminApiFetch("/api/admin/upload-image", {
    method: "POST",
    body: formData,
  });

  const json = (await res.json()) as {
    success: boolean;
    data?: { url: string };
    error?: string;
  };

  if (!json.success || !json.data?.url) {
    throw new Error(json.error ?? "Image upload failed");
  }

  return json.data.url;
}
