"use client";

import { useEffect } from "react";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

/**
 * Vercel redirects apex → www (308). Firebase Auth and admin API calls are per-origin;
 * staying on apex breaks server actions and drops Authorization on API redirects.
 */
export function AdminHostEnforcer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    if (host !== PRODUCTION_DOMAIN) return;

    const target = `https://${WWW_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
