"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  checked?: boolean;
}

interface FilterSidebarProps {
  priceRange: [number, number];
  maxPrice: number;
  onPriceChange: (range: [number, number]) => void;
  categories?: FilterOption[];
  selectedCategories?: string[];
  onCategoryToggle?: (id: string) => void;
  categoryLabel?: string;
  budgetOptions?: FilterOption[];
  selectedBudget?: string[];
  onBudgetToggle?: (id: string) => void;
  budgetLabel?: string;
  placeOptions?: FilterOption[];
  selectedPlaces?: string[];
  onPlaceToggle?: (id: string) => void;
  placeLabel?: string;
  onClear: () => void;
  hasActiveFilters?: boolean;
  extraFilters?: React.ReactNode;
  /** Hide price range slider (browse-only hotel lists). */
  hidePriceFilter?: boolean;
  /** Hide header row (used inside mobile collapse panel) */
  embedded?: boolean;
  className?: string;
}

function FilterCheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  scrollable,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
  scrollable?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className={cn("space-y-2", scrollable && "max-h-52 overflow-y-auto pr-1")}>
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={selected.includes(option.id)}
              onCheckedChange={() => onToggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function FilterSidebar({
  priceRange,
  maxPrice,
  onPriceChange,
  categories,
  selectedCategories = [],
  onCategoryToggle,
  categoryLabel = "Category",
  budgetOptions,
  selectedBudget = [],
  onBudgetToggle,
  budgetLabel = "Budget",
  placeOptions,
  selectedPlaces = [],
  onPlaceToggle,
  placeLabel = "City / Places",
  onClear,
  hasActiveFilters = false,
  extraFilters,
  hidePriceFilter = false,
  embedded = false,
  className,
}: FilterSidebarProps) {
  const { locale } = useAppStore();

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h3 className={embedded ? "text-sm font-semibold" : "font-semibold"}>
        {t(locale, "common", "filters")}
      </h3>
      <Button
        variant={hasActiveFilters ? "secondary" : "ghost"}
        size="sm"
        onClick={onClear}
        className={cn(hasActiveFilters && "text-primary")}
      >
        {t(locale, "common", "clearFilters")}
      </Button>
    </div>
  );

  return (
    <aside
      className={cn(
        embedded ? "space-y-5" : "space-y-6 rounded-xl border bg-card p-5 shadow-sm",
        className
      )}
    >
      {header}

      {!hidePriceFilter && (
      <div className="space-y-3">
        <Label>{t(locale, "common", "priceRange")}</Label>
        <Slider
          min={0}
          max={maxPrice}
          step={500}
          value={priceRange}
          onValueChange={(v) => onPriceChange(v as [number, number])}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString("en-IN")}</span>
          <span>₹{priceRange[1].toLocaleString("en-IN")}</span>
        </div>
      </div>
      )}

      {budgetOptions && budgetOptions.length > 0 && onBudgetToggle && (
        <FilterCheckboxGroup
          label={budgetLabel}
          options={budgetOptions}
          selected={selectedBudget}
          onToggle={onBudgetToggle}
        />
      )}

      {placeOptions && placeOptions.length > 0 && onPlaceToggle && (
        <FilterCheckboxGroup
          label={placeLabel}
          options={placeOptions}
          selected={selectedPlaces}
          onToggle={onPlaceToggle}
          scrollable
        />
      )}

      {categories && categories.length > 0 && onCategoryToggle && (
        <FilterCheckboxGroup
          label={categoryLabel}
          options={categories}
          selected={selectedCategories}
          onToggle={onCategoryToggle}
        />
      )}

      {extraFilters}
    </aside>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      placeholder={placeholder ?? "Search..."}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("max-w-md", className)}
    />
  );
}
