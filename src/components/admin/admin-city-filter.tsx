"use client";

import type { CityFilterOption } from "@/lib/admin/city-filter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminCityFilterProps {
  label?: string;
  cities: CityFilterOption[];
  totalCount: number;
  selectedCity: string | null;
  onChange: (cityKey: string | null) => void;
  className?: string;
}

export function AdminCityFilter({
  label = "City",
  cities,
  totalCount,
  selectedCity,
  onChange,
  className,
}: AdminCityFilterProps) {
  if (cities.length === 0) return null;

  return (
    <div className={cn("space-y-2 rounded-xl border bg-card p-3", className)}>
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={selectedCity === null ? "default" : "outline"}
          onClick={() => onChange(null)}
        >
          All ({totalCount})
        </Button>
        {cities.map((city) => (
          <Button
            key={city.key}
            type="button"
            size="sm"
            variant={selectedCity === city.key ? "default" : "outline"}
            onClick={() => onChange(city.key)}
          >
            {city.label} ({city.count})
          </Button>
        ))}
      </div>
    </div>
  );
}
