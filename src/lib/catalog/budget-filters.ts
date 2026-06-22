import type { Locale } from "@/types";

export type BudgetTierId = "budget" | "mid" | "premium" | "luxury";

export const BUDGET_TIER_IDS: BudgetTierId[] = ["budget", "mid", "premium", "luxury"];

export function budgetTierOptions(locale: Locale) {
  return locale === "hi"
    ? [
        { id: "budget" as const, label: "बजट (₹)" },
        { id: "mid" as const, label: "मिड-रेंज" },
        { id: "premium" as const, label: "प्रीमियम" },
        { id: "luxury" as const, label: "लक्ज़री" },
      ]
    : [
        { id: "budget" as const, label: "Budget" },
        { id: "mid" as const, label: "Mid-Range" },
        { id: "premium" as const, label: "Premium" },
        { id: "luxury" as const, label: "Luxury" },
      ];
}

export function getBudgetRanges(maxPrice: number): Record<BudgetTierId, [number, number]> {
  const safeMax = Math.max(maxPrice, 1);
  const p33 = Math.floor(safeMax * 0.33);
  const p66 = Math.floor(safeMax * 0.66);
  const p85 = Math.floor(safeMax * 0.85);
  return {
    budget: [0, p33],
    mid: [p33 + 1, p66],
    premium: [p66 + 1, p85],
    luxury: [p85 + 1, safeMax],
  };
}

export function priceMatchesBudgetTiers(
  price: number,
  selected: BudgetTierId[],
  maxPrice: number
): boolean {
  if (selected.length === 0) return true;
  const ranges = getBudgetRanges(maxPrice);
  return selected.some((tier) => {
    const [min, max] = ranges[tier];
    return price >= min && price <= max;
  });
}

export function toggleFilterId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
