"use client";

import { useState } from "react";
import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
import { TravelManagerPopup } from "@/components/ai/travel-manager-popup";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { markAiAssistantSeen } from "@/lib/ai/assistant-prompt";
import { trackAiAssistantOpen } from "@/lib/analytics";

interface TryAssistantButtonProps {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "secondary" | "outline";
  className?: string;
  showIcon?: boolean;
}

/** Opens the same AI Travel Assistant popup as the floating action button. */
export function TryAssistantButton({
  size = "lg",
  variant = "secondary",
  className,
  showIcon = false,
}: TryAssistantButtonProps) {
  const { locale } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(showIcon && "gap-2", className)}
        onClick={() => {
          markAiAssistantSeen();
          trackAiAssistantOpen();
          setOpen(true);
        }}
      >
        {showIcon && <AiAssistantIcon size={20} className="h-5 w-5" />}
        {t(locale, "features", "aiAssistant")}
      </Button>
      <TravelManagerPopup
        open={open}
        onOpenChange={(next) => {
          if (next) markAiAssistantSeen();
          setOpen(next);
        }}
      />
    </>
  );
}
