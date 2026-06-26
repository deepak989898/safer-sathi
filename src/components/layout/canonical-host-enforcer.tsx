"use client";

import { useEffect } from "react";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

/** Keep users on thesafarsathi.com (apex) so admin API calls stay same-origin. */
export function CanonicalHostEnforcer() {
  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    if (host !== WWW_DOMAIN) return;

    window.location.replace(
      `https://${PRODUCTION_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }, []);

  return null;
}
