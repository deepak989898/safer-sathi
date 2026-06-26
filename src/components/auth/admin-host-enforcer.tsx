"use client";

import { useEffect, useState } from "react";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

/**
 * Firebase Auth and admin APIs are per-origin. Apex also 308-redirects API calls.
 * Block admin UI until the browser is on www.
 */
export function AdminHostEnforcer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    if (host === PRODUCTION_DOMAIN) {
      const target = `https://${WWW_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Redirecting to secure admin URL…
      </div>
    );
  }

  return <>{children}</>;
}
