"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAirlineBrandStyle,
  getAirlineDisplayName,
  getAirlineLogoSources,
} from "@/lib/flights/airline-logos";
import { cn } from "@/lib/utils";

export type AirlineLogoSize = 40 | 44 | 48 | 52;

interface AirlineLogoProps {
  code: string;
  name?: string;
  logoUrl?: string | null;
  size?: AirlineLogoSize;
  className?: string;
  shape?: "rounded" | "circle";
}

const SIZE_CLASS: Record<AirlineLogoSize, string> = {
  40: "h-10 w-10",
  44: "h-11 w-11",
  48: "h-12 w-12",
  52: "h-[52px] w-[52px]",
};

const IMG_SIZE: Record<AirlineLogoSize, number> = {
  40: 32,
  44: 36,
  48: 40,
  52: 44,
};

function AirlineCodeBadge({
  code,
  name,
  size,
  className,
  shape,
}: {
  code: string;
  name: string;
  size: AirlineLogoSize;
  className?: string;
  shape: "rounded" | "circle";
}) {
  const label = (code || "FL").slice(0, 3).toUpperCase();
  const brand = getAirlineBrandStyle(code);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold shadow-sm ring-1",
        SIZE_CLASS[size],
        shape === "circle" ? "rounded-full" : "rounded-xl",
        className
      )}
      style={{
        backgroundColor: brand.bg,
        color: brand.text,
        boxShadow: `inset 0 0 0 1px ${brand.ring}`,
      }}
      title={name}
      aria-label={`${name} (${code})`}
    >
      <span className={size <= 44 ? "text-[10px] tracking-wide" : "text-xs tracking-wide"}>
        {label}
      </span>
    </div>
  );
}

export function AirlineLogo({
  code,
  name,
  logoUrl,
  size = 48,
  className,
  shape = "rounded",
}: AirlineLogoProps) {
  const displayName = name?.trim() || getAirlineDisplayName(code);
  const sources = useMemo(
    () => getAirlineLogoSources(code, logoUrl),
    [code, logoUrl]
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setImageFailed(false);
  }, [code, logoUrl, sources.join("|")]);

  const imageSrc = !imageFailed ? sources[sourceIndex] : undefined;
  const showBadge = !imageSrc;

  if (showBadge) {
    return (
      <AirlineCodeBadge
        code={code}
        name={displayName}
        size={size}
        className={className}
        shape={shape}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-slate-100",
        SIZE_CLASS[size],
        shape === "circle" ? "rounded-full" : "rounded-xl",
        className
      )}
      title={displayName}
    >
      <img
        key={imageSrc}
        src={imageSrc}
        alt={`${displayName} logo`}
        width={IMG_SIZE[size]}
        height={IMG_SIZE[size]}
        className="h-[82%] w-[82%] object-contain"
        loading="lazy"
        decoding="async"
        onError={() => {
          if (sourceIndex < sources.length - 1) {
            setSourceIndex((index) => index + 1);
          } else {
            setImageFailed(true);
          }
        }}
      />
    </div>
  );
}
