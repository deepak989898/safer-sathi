"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { TravelManagerPopup } from "@/components/ai/travel-manager-popup";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AiAssistantFab() {
  const pathname = usePathname();
  const { locale } = useAppStore();
  const [open, setOpen] = useState(false);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <Link
          href="/ai-assistant"
          className={cn(
            "hidden rounded-full bg-background px-3 py-1.5 text-xs font-medium shadow-md sm:inline-block",
            pathname.startsWith("/ai-assistant") && "pointer-events-none opacity-50"
          )}
        >
          {t(locale, "features", "aiAssistant")}
        </Link>
        <button
          type="button"
          aria-label={t(locale, "features", "aiAssistant")}
          onClick={() => setOpen(true)}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full text-white",
            "bg-gradient-to-br from-primary via-sky-500 to-cyan-400",
            "shadow-lg shadow-primary/40 ring-4 ring-background",
            "transition-transform hover:scale-105 active:scale-95"
          )}
        >
          <Sparkles className="h-7 w-7 drop-shadow-sm" strokeWidth={2} />
        </button>
      </div>
      <TravelManagerPopup open={open} onOpenChange={setOpen} />
    </>
  );
}
