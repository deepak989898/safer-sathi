"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
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
      <button
        type="button"
        aria-label={t(locale, "features", "aiAssistant")}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-white shadow-lg shadow-primary/25 ring-4 ring-background",
          "transition-transform hover:scale-105 active:scale-95",
          "dark:bg-white dark:shadow-black/30"
        )}
      >
        <AiAssistantIcon size={36} className="h-9 w-9" priority />
      </button>
      <TravelManagerPopup open={open} onOpenChange={setOpen} />
    </>
  );
}
