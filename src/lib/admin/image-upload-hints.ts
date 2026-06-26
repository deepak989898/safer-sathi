import type { AdminUploadFolder } from "@/lib/firebase/admin-storage";

export const ADMIN_IMAGE_COMPRESS_NOTE =
  "Auto-compressed to WebP (max 1920px, ~800 KB). Use landscape photos with the subject centered.";

const GALLERY_INTRO =
  "First image = main photo on listing cards and the detail page. Upload or paste one URL per line.";

/** Multi-image galleries (packages, hotels, vehicles). */
export const ADMIN_IMAGE_GALLERY_HINTS: Record<
  Extract<AdminUploadFolder, "packages" | "hotels" | "vehicles" | "tours">,
  string
> = {
  packages: [
    GALLERY_INTRO,
    "Recommended: 1920×1200 px (16:10 landscape), 5–8 photos.",
    "Order: destination → hotel → activities → vehicle → meals → scenic extras.",
    ADMIN_IMAGE_COMPRESS_NOTE,
  ].join("\n"),
  tours: [
    GALLERY_INTRO,
    "Recommended: 1920×1200 px (16:10 landscape), 5–8 photos.",
    "Order: destination → hotel → activities → vehicle → meals → scenic extras.",
    ADMIN_IMAGE_COMPRESS_NOTE,
  ].join("\n"),
  hotels: [
    GALLERY_INTRO,
    "Recommended: 1920×1200 px (16:10 landscape), 5–8 photos.",
    "Order: exterior → lobby → room → bathroom → restaurant → pool/amenities.",
    ADMIN_IMAGE_COMPRESS_NOTE,
  ].join("\n"),
  vehicles: [
    GALLERY_INTRO,
    "Recommended: 1920×1200 px (16:10 landscape), 3–5 photos.",
    "Order: full side view → front/rear → interior/seats → on-road (optional).",
    ADMIN_IMAGE_COMPRESS_NOTE,
  ].join("\n"),
};

export const ADMIN_BLOG_FEATURED_UPLOAD_HINT = [
  "Featured hero — shown on the blog page banner and in Google/social previews.",
  "Recommended: 1920×823 px (21:9 wide landscape). Keep the main subject in the center.",
  ADMIN_IMAGE_COMPRESS_NOTE,
].join("\n");

export const ADMIN_BLOG_IMAGES_SECTION_HINT = [
  "Featured image: 1920×823 px (21:9). In-article images: 1200×675 px (16:9), 4–8 for long posts.",
  "Click a thumbnail below to set the featured hero. Match photos to the blog title/destination.",
].join("\n");

export type AdminImageUploadHintVariant = "gallery" | "blog-featured";

export function getAdminImageUploadHint(
  folder: AdminUploadFolder,
  variant: AdminImageUploadHintVariant = "gallery"
): string {
  if (variant === "blog-featured" || folder === "blogs") {
    return ADMIN_BLOG_FEATURED_UPLOAD_HINT;
  }

  if (folder in ADMIN_IMAGE_GALLERY_HINTS) {
    return ADMIN_IMAGE_GALLERY_HINTS[folder as keyof typeof ADMIN_IMAGE_GALLERY_HINTS];
  }

  return [GALLERY_INTRO, ADMIN_IMAGE_COMPRESS_NOTE].join("\n");
}
