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
  /** Always show light backdrop (e.g. admin sidebar on dark background) */
  onDarkSurface?: boolean;
}

const LOGO_SRC = "/images/safarsathilogo.png";

const sizeClasses: Record<BrandLogoSize, string> = {
  header:
    "h-14 w-auto max-w-[180px] sm:h-16 sm:max-w-[210px] md:h-[4.5rem] md:max-w-[240px]",
  drawer: "h-16 w-auto max-w-[200px] sm:h-[4.5rem] sm:max-w-[220px]",
  footer: "h-16 w-auto max-w-[220px] sm:h-[4.5rem] sm:max-w-[240px]",
  admin: "h-12 w-auto max-w-[160px]",
  compact: "h-10 w-auto max-w-[140px]",
};

const imageDimensions: Record<BrandLogoSize, { width: number; height: number }> = {
  header: { width: 320, height: 128 },
  drawer: { width: 280, height: 112 },
  footer: { width: 280, height: 112 },
  admin: { width: 220, height: 88 },
  compact: { width: 180, height: 72 },
};

export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  size = "header",
  showTagline = false,
  priority = false,
  centered = false,
  onDarkSurface = false,
}: BrandLogoProps) {
  const dims = imageDimensions[size];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3",
        centered && "mx-auto justify-center",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg",
          onDarkSurface
            ? "bg-white px-2 py-1 shadow-sm ring-1 ring-black/5"
            : "dark:bg-white dark:px-2 dark:py-1 dark:shadow-sm dark:ring-1 dark:ring-black/5"
        )}
      >
        <Image
          src={LOGO_SRC}
          alt="Safar Sathi — Travel | Comfort | Trust"
          width={dims.width}
          height={dims.height}
          priority={priority}
          className={cn("object-contain", sizeClasses[size], imageClassName)}
        />
      </span>
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
    <Link href={href} className={cn("inline-flex shrink-0 items-center", centered && "w-full justify-center")}>
      {content}
    </Link>
  );
}

export { LOGO_SRC };
