import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site-config";
import { siteManifestIcons } from "@/lib/site-icons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Safar Sathi",
    short_name: "Safar Sathi",
    description: "Tour packages, hotels, and vehicles across India",
    start_url: appUrl("/"),
    scope: appUrl("/"),
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a5f",
    icons: [...siteManifestIcons] as MetadataRoute.Manifest["icons"],
  };
}
