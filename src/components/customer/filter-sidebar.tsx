"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";

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
  onClear: () => void;
  extraFilters?: React.ReactNode;
}

export function FilterSidebar({
  priceRange,
  maxPrice,
  onPriceChange,
  categories,
  selectedCategories = [],
  onCategoryToggle,
  onClear,
  extraFilters,
}: FilterSidebarProps) {
  const { locale } = useAppStore();

  return (
    <aside className="space-y-6 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t(locale, "common", "filters")}</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t(locale, "common", "clearFilters")}
        </Button>
      </div>

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
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="space-y-3">
          <Label>Category</Label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => onCategoryToggle?.(cat.id)}
              />
              {cat.label}
            </label>
          ))}
        </div>
      )}

      {extraFilters}
    </aside>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      placeholder={placeholder ?? "Search..."}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-md"
    />
  );
}
