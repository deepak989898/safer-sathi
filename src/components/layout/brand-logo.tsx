import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  showTagline?: boolean;
  priority?: boolean;
}

export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  showTagline = false,
  priority = false,
}: BrandLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/images/logo.png"
        alt="Safar Sathi - Travel | Comfort | Trust"
        width={160}
        height={64}
        priority={priority}
        className={cn("h-12 w-auto object-contain sm:h-14", imageClassName)}
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
    <Link href={href} className="inline-flex shrink-0 items-center">
      {content}
    </Link>
  );
}
