"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAdmin } from "@/lib/auth/constants";
import { PRODUCTION_DOMAIN } from "@/lib/site-config";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname.toLowerCase() === "thesafarsathi.com") {
      window.location.replace(
        `https://${PRODUCTION_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }

    if (!canAccessAdmin(user.role)) {
      router.replace("/my-bookings");
      return;
    }

    if (user.status === "pending" || !user.approved) {
      router.replace("/pending-approval");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user || !canAccessAdmin(user.role) || user.status !== "active" || !user.approved) {
    return null;
  }

  return <>{children}</>;
}
