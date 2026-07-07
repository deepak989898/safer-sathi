"use client";

import { useEffect } from "react";

/** Hides the global site footer while mounted (e.g. flight search hero). */
export function HideSiteFooter() {
  useEffect(() => {
    document.documentElement.dataset.hideSiteFooter = "true";
    return () => {
      delete document.documentElement.dataset.hideSiteFooter;
    };
  }, []);

  return null;
}
