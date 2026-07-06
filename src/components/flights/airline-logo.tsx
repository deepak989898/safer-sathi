"use client";

import { useEffect, useMemo, useState } from "react";
import { getAirlineLogoSources } from "@/lib/flights/airline-logos";
import { cn } from "@/lib/utils";

interface AirlineLogoProps {
  code: string;
  name: string;
  size?: 44 | 48;
  className?: string;
}

function AirlineCodeBadge({
  code,
  size,
  className,
}: {
  code: string;
  size: 44 | 48;
  className?: string;
}) {
  const label = (code || "FL").slice(0, 3).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 font-bold text-[#1a4fa3] shadow-sm ring-1 ring-blue-100",
        size === 44 ? "h-11 w-11 text-xs" : "h-12 w-12 text-sm",
        className
      )}
      aria-hidden
    >
      {label}
    </div>
  );
}

export function AirlineLogo({ code, name, size = 48, className }: AirlineLogoProps) {
  const sources = useMemo(() => getAirlineLogoSources(code), [code]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [code, sources]);

  const imageSrc = sources[sourceIndex];
  const showBadge = !imageSrc;

  if (showBadge) {
    return <AirlineCodeBadge code={code} size={size} className={className} />;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100",
        size === 44 ? "h-11 w-11" : "h-12 w-12",
        className
      )}
    >
      <img
        src={imageSrc}
        alt={`${name} logo`}
        width={size === 44 ? 36 : 40}
        height={size === 44 ? 36 : 40}
        className="object-contain p-1"
        loading="lazy"
        decoding="async"
        onError={() => {
          setSourceIndex((index) => index + 1);
        }}
      />
    </div>
  );
}
