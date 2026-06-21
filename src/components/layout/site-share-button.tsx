"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appUrl, SITE_CONTACT, SITE_NAME } from "@/lib/site-config";
import { toast } from "sonner";

const SHARE_TEXT = `Plan your next trip with ${SITE_NAME} — packages, hotels & vehicles across India.`;

function buildShareLinks(url: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${SHARE_TEXT} ${url}`);
  return {
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

export function SiteShareButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = appUrl();
  const links = buildShareLinks(url);

  const tryNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      toast.message("Choose a platform below to share.");
      return;
    }
    try {
      await navigator.share({
        title: SITE_NAME,
        text: SHARE_TEXT,
        url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.message("Choose a platform below to share.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label="Share Safar Sathi"
          />
        }
      >
        <Share2 className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => void tryNativeShare()}>
          Share to apps…
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(links.whatsapp, "_blank", "noopener,noreferrer")}
        >
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(links.facebook, "_blank", "noopener,noreferrer")}
        >
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void copyLink();
            window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
            toast.message("Link copied — paste it in your Instagram story or bio.");
          }}
        >
          Share on Instagram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copyLink()}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(SITE_CONTACT.whatsappUrl, "_blank", "noopener,noreferrer")}
        >
          Chat on WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
