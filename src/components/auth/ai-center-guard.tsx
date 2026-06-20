"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { Skeleton } from "@/components/ui/skeleton";

export function AiCenterGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !canAccessAICenter(user.role)) {
      router.replace("/admin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user || !canAccessAICenter(user.role)) return null;

  return <>{children}</>;
}
