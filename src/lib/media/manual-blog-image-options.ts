export type ManualBlogImageModeId = "catalog" | "unsplash" | "pexels" | "ai";

export const MANUAL_BLOG_IMAGE_OPTIONS: Array<{
  id: ManualBlogImageModeId;
  label: string;
  description: string;
}> = [
  {
    id: "catalog",
    label: "Catalog stock (free)",
    description: "Safar Sathi destination image catalog — fast, no API key.",
  },
  {
    id: "unsplash",
    label: "Unsplash (free)",
    description: "Free Unsplash photos (API key optional; curated fallback).",
  },
  {
    id: "pexels",
    label: "Pexels (free)",
    description: "Free Pexels photos when PEXELS_API_KEY is set; else Unsplash fallback.",
  },
  {
    id: "ai",
    label: "Generate with AI",
    description: "OpenAI featured image (requires AI images enabled in settings).",
  },
];
