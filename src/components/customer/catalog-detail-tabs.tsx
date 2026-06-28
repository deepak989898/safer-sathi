import type { ComponentProps, ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const catalogDetailTabsListClass =
  "h-auto w-full flex-wrap justify-start gap-0 border-b border-border/60 bg-transparent p-0";

export const catalogDetailTabTriggerClass = cn(
  "rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium",
  "-mb-px text-primary/75 hover:text-primary",
  "data-active:border-x-transparent data-active:border-t-transparent data-active:border-b-primary",
  "data-active:bg-transparent data-active:text-primary",
  "data-active:font-semibold data-active:shadow-none",
  "dark:data-active:border-x-transparent dark:data-active:border-t-transparent dark:data-active:bg-transparent",
  "after:!hidden",
  "focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none",
  "transition-colors"
);

export function CatalogDetailTabsList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <TabsList variant="line" className={cn(catalogDetailTabsListClass, className)}>
      {children}
    </TabsList>
  );
}

export function CatalogDetailTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger className={cn(catalogDetailTabTriggerClass, className)} {...props} />
  );
}
