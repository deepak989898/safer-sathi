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
  /** Always use dark-theme logo (e.g. admin sidebar) */
  onDarkSurface?: boolean;
}

const LOGO_LIGHT_SRC = "/images/safarsathilogo.png";
const LOGO_DARK_SRC = "/images/safarsathidarklogo.png";

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
  const imgClass = cn("object-contain object-left", sizeClasses[size], imageClassName);

  const content = (
    <div
      className={cn(
        "flex items-center gap-3",
        centered && "mx-auto justify-center",
        className
      )}
    >
      {onDarkSurface ? (
        <Image
          src={LOGO_DARK_SRC}
          alt="Safar Sathi — Travel | Comfort | Trust"
          width={dims.width}
          height={dims.height}
          priority={priority}
          className={imgClass}
        />
      ) : (
        <>
          <Image
            src={LOGO_LIGHT_SRC}
            alt="Safar Sathi — Travel | Comfort | Trust"
            width={dims.width}
            height={dims.height}
            priority={priority}
            className={cn(imgClass, "dark:hidden")}
          />
          <Image
            src={LOGO_DARK_SRC}
            alt="Safar Sathi — Travel | Comfort | Trust"
            width={dims.width}
            height={dims.height}
            priority={priority}
            className={cn(imgClass, "hidden dark:block")}
          />
        </>
      )}
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

/** @deprecated Use LOGO_LIGHT_SRC */
const LOGO_SRC = LOGO_LIGHT_SRC;

export { LOGO_SRC, LOGO_LIGHT_SRC, LOGO_DARK_SRC };
