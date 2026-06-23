import type { PackagePublishStatus } from "@/types";

export function isCatalogPublished(publishStatus?: PackagePublishStatus): boolean {
  return !publishStatus || publishStatus === "published";
}
