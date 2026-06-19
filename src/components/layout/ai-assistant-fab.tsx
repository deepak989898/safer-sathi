"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AiAssistantFab() {
  const pathname = usePathname();
  const { locale } = useAppStore();

  if (
    pathname.startsWith("/ai-assistant") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  return (
    <Link
      href="/ai-assistant"
      aria-label={t(locale, "features", "aiAssistant")}
      className={cn(
        "group fixed bottom-6 right-6 z-50 flex items-center gap-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      <span
        className={cn(
          "pointer-events-none hidden rounded-full bg-background px-3 py-1.5 text-sm font-medium shadow-md",
          "opacity-0 transition-all group-hover:opacity-100 sm:inline-block"
        )}
      >
        {t(locale, "features", "aiAssistant")}
      </span>
      <span
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full text-white",
          "bg-gradient-to-br from-primary via-sky-500 to-cyan-400",
          "shadow-lg shadow-primary/40 ring-4 ring-background",
          "transition-transform hover:scale-105 active:scale-95"
        )}
      >
        <Sparkles className="relative h-7 w-7 drop-shadow-sm" strokeWidth={2} />
      </span>
    </Link>
  );
}
