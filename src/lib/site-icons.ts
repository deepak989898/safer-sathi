import type { Metadata } from "next";

/** Brand favicon source — `public/images/favicon.svg` */
export const SITE_FAVICON_SVG = "/images/favicon.svg";
export const SITE_FAVICON_PNG = "/favicon.png";
export const SITE_FAVICON_PNG_48 = "/images/favicon-48.png";
export const SITE_FAVICON_PNG_192 = "/images/favicon-192.png";
export const SITE_APPLE_TOUCH_ICON = "/apple-touch-icon.png";
export const SITE_FAVICON_ICO = "/favicon.ico";

/** Shared icon metadata for all pages (home, blogs, admin, etc.) */
export const siteIconsMetadata: Metadata["icons"] = {
  icon: [
    { url: SITE_FAVICON_SVG, type: "image/svg+xml" },
    { url: SITE_FAVICON_ICO, sizes: "32x32" },
    { url: SITE_FAVICON_PNG_48, type: "image/png", sizes: "48x48" },
    { url: SITE_FAVICON_PNG_192, type: "image/png", sizes: "192x192" },
    { url: SITE_FAVICON_PNG, type: "image/png", sizes: "512x512" },
  ],
  apple: [{ url: SITE_APPLE_TOUCH_ICON, sizes: "180x180", type: "image/png" }],
  shortcut: SITE_FAVICON_SVG,
};

export const siteManifestIcons = [
  {
    src: SITE_FAVICON_SVG,
    sizes: "any",
    type: "image/svg+xml",
    purpose: "any",
  },
  {
    src: SITE_FAVICON_PNG_48,
    sizes: "48x48",
    type: "image/png",
    purpose: "any",
  },
  {
    src: SITE_FAVICON_PNG_192,
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: SITE_FAVICON_PNG,
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: SITE_APPLE_TOUCH_ICON,
    sizes: "180x180",
    type: "image/png",
    purpose: "any",
  },
] as const;
