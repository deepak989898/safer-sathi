"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
import { TravelManagerPopup } from "@/components/ai/travel-manager-popup";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { trackAiAssistantOpen } from "@/lib/analytics";
import {
  hasSeenAiAssistant,
  markAiAssistantSeen,
} from "@/lib/ai/assistant-prompt";

const AUTO_OPEN_DELAY_MS = 30_000;

function shouldSkipAutoOpen(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/ai-assistant") ||
    pathname.startsWith("/ai-voice") ||
    pathname.startsWith("/booking")
  );
}

export function AiAssistantFab() {
  const pathname = usePathname();
  const { locale } = useAppStore();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (shouldSkipAutoOpen(pathname)) return;
    if (typeof window === "undefined") return;
    if (hasSeenAiAssistant()) return;

    const timer = window.setTimeout(() => {
      if (hasSeenAiAssistant() || openRef.current) return;
      markAiAssistantSeen();
      trackAiAssistantOpen();
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const handleOpen = () => {
    markAiAssistantSeen();
    trackAiAssistantOpen();
    setOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) markAiAssistantSeen();
    setOpen(next);
  };

  if (shouldSkipAutoOpen(pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={t(locale, "features", "aiAssistant")}
        onClick={handleOpen}
        className={cn(
          "fixed bottom-5 right-5 z-50 rounded-full sm:bottom-6 sm:right-6",
          "flex h-[4.5rem] w-[4.5rem] items-center justify-center p-2",
          "bg-gradient-to-br from-[#fde047] via-[#facc15] to-[#f59e0b]",
          "shadow-lg shadow-amber-500/35 ring-2 ring-white",
          "transition-transform hover:scale-105 active:scale-95",
          "dark:ring-amber-100/90 dark:shadow-amber-600/40"
        )}
      >
        <AiAssistantIcon
          size={52}
          priority
          className="h-[3.25rem] w-[3.25rem] object-contain"
        />
      </button>
      <TravelManagerPopup open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
