import Link from "next/link";
import { MapPin } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types";

interface MobileShowcaseCardProps {
  href: string;
  image: string;
  title: string;
  subtitle: string;
  price: number;
  locale: Locale;
  className?: string;
  /** carousel = horizontal scroll strip; grid = 2-column mobile grid */
  layout?: "carousel" | "grid";
  /** Landscape catalog images (hotels, vehicles) need a wider frame on mobile. */
  category?: "packages" | "hotels" | "vehicles";
}

const IMAGE_FRAME: Record<
  NonNullable<MobileShowcaseCardProps["category"]>,
  { aspect: string; imageClass: string }
> = {
  packages: {
    aspect: "aspect-[4/5]",
    imageClass: "object-cover object-center",
  },
  hotels: {
    aspect: "aspect-[4/3]",
    imageClass: "object-contain object-center bg-slate-200/80",
  },
  vehicles: {
    aspect: "aspect-[4/3]",
    imageClass: "object-contain object-center bg-slate-200/80",
  },
};

export function MobileShowcaseCard({
  href,
  image,
  title,
  subtitle,
  price,
  locale,
  className,
  layout = "carousel",
  category = "packages",
}: MobileShowcaseCardProps) {
  const frame = IMAGE_FRAME[category];

  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-[18px] shadow-md ring-1 ring-black/5",
        layout === "grid"
          ? "w-full"
          : "w-[168px] shrink-0 snap-start",
        className
      )}
    >
      <div className={cn("relative w-full bg-muted/40", frame.aspect)}>
        <SafeImage
          src={image}
          alt={title}
          fill
          sizes={layout === "grid" ? "50vw" : "168px"}
          className={cn(
            "transition-transform duration-300 group-hover:scale-105",
            frame.imageClass
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="min-w-0 text-white">
            <p className="flex items-center gap-1 text-sm font-semibold leading-tight">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-white/90">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
            {formatCurrency(price, locale)}
          </span>
        </div>
      </div>
    </Link>
  );
}
