import { HERO_IMAGES, heroBackgroundStyle } from "@/lib/media/travel-images";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  subtitle,
  children,
  className,
  image = HERO_IMAGES.default,
  /** On mobile: show only a compact heading (no background image hero) */
  compactOnMobile = false,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  image?: string;
  compactOnMobile?: boolean;
}) {
  if (compactOnMobile) {
    return (
      <>
        <section className="border-b bg-background py-4 md:hidden">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
            {children && <div className="mt-4">{children}</div>}
          </div>
        </section>

        <section
          className={cn(
            "relative hidden overflow-hidden py-16 text-primary-foreground md:block md:py-20",
            className
          )}
          style={heroBackgroundStyle(image)}
        >
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm md:text-4xl lg:text-5xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-4 text-lg text-primary-foreground/90 drop-shadow-sm">
                  {subtitle}
                </p>
              )}
            </div>
            {children && <div className="mt-8">{children}</div>}
          </div>
        </section>
      </>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden py-16 text-primary-foreground md:py-20",
        className
      )}
      style={heroBackgroundStyle(image)}
    >
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-lg text-primary-foreground/90 drop-shadow-sm">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function ImageBannerSection({
  children,
  className,
  image = HERO_IMAGES.default,
}: {
  children: React.ReactNode;
  className?: string;
  image?: string;
}) {
  return (
    <section
      className={cn("relative overflow-hidden text-primary-foreground", className)}
      style={heroBackgroundStyle(image)}
    >
      {children}
    </section>
  );
}
