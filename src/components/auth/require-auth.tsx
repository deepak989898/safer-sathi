"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireAuth({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Skeleton className="mb-4 h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
