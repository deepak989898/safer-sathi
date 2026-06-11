import { cn } from "@/lib/utils";

export function PageHero({
  title,
  subtitle,
  children,
  className,
  image,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  image?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-20",
        className
      )}
      style={
        image
          ? {
              backgroundImage: `linear-gradient(135deg, oklch(0.22 0.08 264 / 0.92), oklch(0.52 0.19 264 / 0.75)), url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-lg text-primary-foreground/90">{subtitle}</p>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
