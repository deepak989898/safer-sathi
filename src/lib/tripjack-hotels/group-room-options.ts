import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

export interface RoomOptionGroup {
  groupKey: string;
  roomTitle: string;
  primary: NormalizedHotelOption;
  alternates: NormalizedHotelOption[];
}

function roomGroupKey(option: NormalizedHotelOption): string {
  const title = (option.roomInfo[0] || option.roomName || option.roomType || "Room")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return title;
}

function roomDisplayTitle(option: NormalizedHotelOption): string {
  return option.roomInfo[0] || option.roomName || option.roomType || "Room";
}

/** Group options with the same room name; cheapest option is primary per group. */
export function groupRoomOptions(options: NormalizedHotelOption[]): RoomOptionGroup[] {
  const sorted = [...options].sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
  const map = new Map<string, NormalizedHotelOption[]>();

  for (const option of sorted) {
    const key = roomGroupKey(option);
    const list = map.get(key) ?? [];
    list.push(option);
    map.set(key, list);
  }

  const groups: RoomOptionGroup[] = [];
  for (const [groupKey, list] of map.entries()) {
    const ordered = [...list].sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
    const [primary, ...alternates] = ordered;
    if (!primary) continue;
    groups.push({
      groupKey,
      roomTitle: roomDisplayTitle(primary),
      primary,
      alternates,
    });
  }

  return groups.sort((a, b) => a.primary.pricing.totalPrice - b.primary.pricing.totalPrice);
}

export function findCheapestOptionId(options: NormalizedHotelOption[]): string {
  if (!options.length) return "";
  const sorted = [...options].sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
  return sorted[0]?.optionId ?? "";
}
