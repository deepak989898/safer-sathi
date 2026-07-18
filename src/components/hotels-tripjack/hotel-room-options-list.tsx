"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HotelRoomOptionCard } from "@/components/hotels-tripjack/hotel-room-option-card";
import { groupRoomOptions } from "@/lib/tripjack-hotels/group-room-options";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface HotelRoomOptionsListProps {
  options: NormalizedHotelOption[];
  selectedOptionId: string;
  locale: Locale;
  onSelect: (optionId: string) => void;
  onConfirm: (optionId: string) => void;
}

export function HotelRoomOptionsList({
  options,
  selectedOptionId,
  locale,
  onSelect,
  onConfirm,
}: HotelRoomOptionsListProps) {
  const groups = groupRoomOptions(options);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const expanded = expandedGroups[group.groupKey] ?? false;
        const alternatesVisible = expanded ? group.alternates : [];

        return (
          <div key={group.groupKey} className="space-y-2">
            <HotelRoomOptionCard
              option={group.primary}
              selected={group.primary.optionId === selectedOptionId}
              locale={locale}
              onSelect={onSelect}
              onConfirm={onConfirm}
            />

            {group.alternates.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-semibold text-[#006CE4] hover:underline"
                onClick={() => toggleGroup(group.groupKey)}
              >
                More options ({group.alternates.length})
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}

            {alternatesVisible.map((option) => (
              <HotelRoomOptionCard
                key={option.optionId}
                option={option}
                selected={option.optionId === selectedOptionId}
                locale={locale}
                onSelect={onSelect}
                onConfirm={onConfirm}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
