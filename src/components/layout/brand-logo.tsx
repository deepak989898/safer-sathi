import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoSize = "header" | "drawer" | "footer" | "admin" | "compact";

interface BrandLogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  size?: BrandLogoSize;
  showTagline?: boolean;
  priority?: boolean;
  centered?: boolean;
  /** Kept for callers; logo.svg works on light and dark surfaces. */
  onDarkSurface?: boolean;
}

/** Site brand mark — `public/images/logo.svg` */
export const LOGO_SRC = "/images/logo.svg";
export const LOGO_LIGHT_SRC = LOGO_SRC;
export const LOGO_DARK_SRC = LOGO_SRC;

const sizeClasses: Record<BrandLogoSize, string> = {
  header: "h-14 w-auto sm:h-16 md:h-[4.5rem] lg:h-20",
  drawer: "h-16 w-auto sm:h-[4.5rem]",
  footer: "h-14 w-auto sm:h-16",
  admin: "h-12 w-auto sm:h-14",
  compact: "h-11 w-auto",
};

const imageDimensions: Record<BrandLogoSize, { width: number; height: number }> = {
  header: { width: 320, height: 320 },
  drawer: { width: 280, height: 280 },
  footer: { width: 260, height: 260 },
  admin: { width: 220, height: 220 },
  compact: { width: 180, height: 180 },
};

export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  size = "header",
  showTagline = false,
  priority = false,
  centered = false,
}: BrandLogoProps) {
  const dims = imageDimensions[size];
  const imgClass = cn(
    "object-contain object-left",
    sizeClasses[size],
    imageClassName
  );

  const content = (
    <div
      className={cn(
        "flex items-center gap-3",
        centered && "mx-auto justify-center",
        className
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="Safar Sathi — Travel | Comfort | Trust"
        width={dims.width}
        height={dims.height}
        priority={priority}
        unoptimized
        className={imgClass}
      />
      {showTagline && (
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-primary">Safar Sathi</p>
          <p className="text-xs text-muted-foreground">Travel | Comfort | Trust</p>
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center overflow-visible",
        centered && "w-full justify-center"
      )}
    >
      {content}
    </Link>
  );
}
