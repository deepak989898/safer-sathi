"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AdminImageThumbnailProps {
  images: string[];
  alt: string;
  className?: string;
}

export function AdminImageThumbnail({ images, alt, className }: AdminImageThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const validImages = images.filter(Boolean);
  const thumb = validImages[0];

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? validImages.length - 1 : i - 1));
  }, [validImages.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= validImages.length - 1 ? 0 : i + 1));
  }, [validImages.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  if (!thumb) {
    return (
      <div
        className={cn(
          "flex h-12 w-16 items-center justify-center rounded-md border bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        className={cn(
          "group relative h-12 w-16 shrink-0 overflow-hidden rounded-md border bg-muted ring-offset-background transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
        aria-label={`View ${validImages.length} image(s) for ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={alt} className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
          <ZoomIn className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100" />
        </span>
        {validImages.length > 1 && (
          <span className="absolute bottom-0 right-0 rounded-tl bg-black/75 px-1 py-0.5 text-[10px] font-medium text-white">
            {validImages.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="truncate text-base">
                {alt}
                {validImages.length > 1 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {index + 1} / {validImages.length}
                  </span>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close gallery"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/95 p-4">
            {validImages.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-lg"
                onClick={goPrev}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[index]}
              alt={`${alt} — image ${index + 1}`}
              className="max-h-[min(60vh,520px)] w-auto max-w-full cursor-zoom-in rounded-lg object-contain"
              onClick={() => {
                window.open(validImages[index], "_blank", "noopener,noreferrer");
              }}
              title="Click to open full size in new tab"
            />

            {validImages.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-lg"
                onClick={goNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>

          {validImages.length > 1 && (
            <div className="shrink-0 border-t bg-background p-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {validImages.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition",
                      i === index ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Use arrow keys or thumbnails · Click main image to open full size
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
