import type { ComponentProps, ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const catalogDetailTabsListClass =
  "h-auto w-full flex-wrap justify-start gap-0.5 border-b border-border/80 bg-transparent p-0";

export const catalogDetailTabTriggerClass = cn(
  "rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm font-medium",
  "text-[#64748b] hover:text-[#0c2444]",
  "data-active:border-primary data-active:bg-primary/5 data-active:text-primary",
  "data-active:font-semibold data-active:shadow-none",
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
