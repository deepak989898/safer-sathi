"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appUrl, SITE_NAME } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHARE_TEXT = `Plan your next trip with ${SITE_NAME} — packages, hotels & vehicles across India.`;

export function SiteShareButton({ className }: { className?: string }) {
  const url = appUrl();

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: SITE_NAME,
          text: SHARE_TEXT,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Sharing is not supported on this device.");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        className
      )}
      aria-label="Share Safar Sathi"
      onClick={() => void handleShare()}
    >
      <Share2 className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} />
    </Button>
  );
}
