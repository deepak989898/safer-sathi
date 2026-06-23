import { compressImageFile } from "@/lib/image-compress";
import type { AdminUploadFolder } from "@/lib/firebase/admin-storage";

export async function uploadAdminImageFile(
  file: File,
  folder: AdminUploadFolder,
  actorRole: string
): Promise<string> {
  const compressed = await compressImageFile(file);

  const formData = new FormData();
  formData.append("file", compressed, compressed.name);
  formData.append("actorRole", actorRole);
  formData.append("folder", folder);

  const res = await fetch("/api/admin/upload-image", {
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
