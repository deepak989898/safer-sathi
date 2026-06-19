"use client";

import { useState } from "react";
import { ArrowDownUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { getSortLabel, type CatalogSortKey } from "@/lib/catalog/sort";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MobileFilterSortBarProps {
  filterPanel: React.ReactNode;
  sortKeys: CatalogSortKey[];
  sortValue: CatalogSortKey;
  onSortChange: (value: CatalogSortKey) => void;
  activeFilterCount?: number;
}

export function MobileFilterSortBar({
  filterPanel,
  sortKeys,
  sortValue,
  onSortChange,
  activeFilterCount = 0,
}: MobileFilterSortBarProps) {
  const { locale } = useAppStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const openFilter = () => {
    setSortOpen(false);
    setFilterOpen((prev) => !prev);
  };

  const openSort = () => {
    setFilterOpen(false);
    setSortOpen((prev) => !prev);
  };

  return (
    <div className="space-y-3 lg:hidden">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={filterOpen ? "default" : "outline"}
          className="h-11 justify-between gap-2 px-3"
          onClick={openFilter}
          aria-expanded={filterOpen}
        >
          <span className="flex items-center gap-2 truncate">
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(locale, "common", "filters")}</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              filterOpen && "rotate-180"
            )}
          />
        </Button>

        <Button
          type="button"
          variant={sortOpen ? "default" : "outline"}
          className="h-11 justify-between gap-2 px-3"
          onClick={openSort}
          aria-expanded={sortOpen}
        >
          <span className="flex items-center gap-2 truncate">
            <ArrowDownUp className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(locale, "common", "sort")}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              sortOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      {filterOpen && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 rounded-xl border bg-card p-4 shadow-sm duration-200">
          {filterPanel}
        </div>
      )}

      {sortOpen && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 rounded-xl border bg-card p-4 shadow-sm duration-200">
          <SortPanel
            sortKeys={sortKeys}
            sortValue={sortValue}
            onSortChange={(value) => {
              onSortChange(value);
              setSortOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

interface SortPanelProps {
  sortKeys: CatalogSortKey[];
  sortValue: CatalogSortKey;
  onSortChange: (value: CatalogSortKey) => void;
  className?: string;
  compact?: boolean;
}

export function SortPanel({
  sortKeys,
  sortValue,
  onSortChange,
  className,
  compact = false,
}: SortPanelProps) {
  const { locale } = useAppStore();

  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <Label className="text-sm font-semibold">{t(locale, "common", "sortBy")}</Label>
      )}
      <div className="space-y-1">
        {sortKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onSortChange(key)}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              sortValue === key
                ? "bg-primary/10 font-medium text-primary"
                : "hover:bg-muted"
            )}
          >
            {getSortLabel(locale, key)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DesktopSortBarProps {
  sortKeys: CatalogSortKey[];
  sortValue: CatalogSortKey;
  onSortChange: (value: CatalogSortKey) => void;
  resultCount?: number;
}

export function DesktopSortBar({
  sortKeys,
  sortValue,
  onSortChange,
  resultCount,
}: DesktopSortBarProps) {
  const { locale } = useAppStore();

  return (
    <div className="mb-4 hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex">
      {resultCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          {resultCount} {t(locale, "common", "results")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <span className="text-sm font-medium text-muted-foreground">
          {t(locale, "common", "sort")}:
        </span>
        {sortKeys.map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={sortValue === key ? "default" : "outline"}
            onClick={() => onSortChange(key)}
          >
            {getSortLabel(locale, key)}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface ListingLayoutProps {
  filterSidebar: React.ReactNode;
  mobileFilterPanel: React.ReactNode;
  sortKeys: CatalogSortKey[];
  sortValue: CatalogSortKey;
  onSortChange: (value: CatalogSortKey) => void;
  activeFilterCount?: number;
  resultCount?: number;
  children: React.ReactNode;
}

export function ListingLayout({
  filterSidebar,
  mobileFilterPanel,
  sortKeys,
  sortValue,
  onSortChange,
  activeFilterCount = 0,
  resultCount,
  children,
}: ListingLayoutProps) {
  const { locale } = useAppStore();

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
      <div className="hidden lg:block">{filterSidebar}</div>

      <div className="space-y-4 lg:space-y-0">
        <MobileFilterSortBar
          filterPanel={mobileFilterPanel}
          sortKeys={sortKeys}
          sortValue={sortValue}
          onSortChange={onSortChange}
          activeFilterCount={activeFilterCount}
        />

        <DesktopSortBar
          sortKeys={sortKeys}
          sortValue={sortValue}
          onSortChange={onSortChange}
          resultCount={resultCount}
        />

        {resultCount !== undefined && (
          <p className="text-sm text-muted-foreground lg:hidden">
            {resultCount} {t(locale, "common", "results")}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
