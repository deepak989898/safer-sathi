"use client";

import { useEffect, useRef } from "react";
import {
  trackBlogView,
  trackHotelView,
  trackPackageView,
  trackVehicleView,
} from "@/lib/analytics";

interface CatalogViewTrackerProps {
  type: "package" | "hotel" | "vehicle" | "blog";
  id: string;
  name: string;
  price?: number;
}

export function CatalogViewTracker({ type, id, name, price }: CatalogViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    switch (type) {
      case "package":
        trackPackageView(id, name, price);
        break;
      case "hotel":
        trackHotelView(id, name, price);
        break;
      case "vehicle":
        trackVehicleView(id, name, price);
        break;
      case "blog":
        trackBlogView(id, name);
        void fetch("/api/analytics/blog-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: id, title: name }),
          keepalive: true,
        });
        break;
    }
  }, [type, id, name, price]);

  return null;
}
