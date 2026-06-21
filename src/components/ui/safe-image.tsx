"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { PLACEHOLDER_TRAVEL_IMAGE } from "@/lib/media/travel-images";
import { seoImageProps } from "@/lib/seo/image-seo";
import { cn } from "@/lib/utils";

type SafeImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  title?: string;
  fallbackSrc?: string;
};

export function SafeImage({
  src,
  alt,
  title,
  fallbackSrc = PLACEHOLDER_TRAVEL_IMAGE,
  className,
  onError,
  priority,
  ...props
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const seo = seoImageProps({ alt, title, priority });

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      {...props}
      {...seo}
      src={imgSrc}
      priority={priority}
      className={cn(className)}
      onError={(event) => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
