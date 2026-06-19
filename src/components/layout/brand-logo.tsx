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
  /** Subtle glow on dark backgrounds (admin sidebar) — no white box */
  onDarkSurface?: boolean;
}

const LOGO_SRC = "/images/safarsathilogo.png";

/** Tall logo — height drives size so all tagline text stays readable */
const sizeClasses: Record<BrandLogoSize, string> = {
  header: "h-[5.25rem] w-auto sm:h-[5.75rem] md:h-[6.25rem] lg:h-[6.75rem]",
  drawer: "h-[5.5rem] w-auto sm:h-[6rem]",
  footer: "h-[5rem] w-auto sm:h-[5.75rem]",
  admin: "h-[4.5rem] w-auto sm:h-[5rem]",
  compact: "h-14 w-auto",
};

const imageDimensions: Record<BrandLogoSize, { width: number; height: number }> = {
  header: { width: 420, height: 520 },
  drawer: { width: 380, height: 480 },
  footer: { width: 380, height: 480 },
  admin: { width: 320, height: 400 },
  compact: { width: 240, height: 300 },
};

const logoGlow =
  "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.85))_drop-shadow(0_0_14px_rgba(255,255,255,0.12))]";

const logoGlowDark =
  "dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.85))_drop-shadow(0_0_14px_rgba(255,255,255,0.12))]";

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
      <Image
        src={LOGO_SRC}
        alt="Safar Sathi — Travel | Comfort | Trust"
        width={dims.width}
        height={dims.height}
        priority={priority}
        className={cn(
          "object-contain object-left",
          sizeClasses[size],
          onDarkSurface ? logoGlow : logoGlowDark,
          imageClassName
        )}
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

export { LOGO_SRC };
