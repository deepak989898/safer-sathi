import type { PackageCategory } from "@/types";
import type { AICompetitorData, AIPriceBreakdown } from "@/lib/ai-travel-manager/types";

const CATEGORY_BENCHMARKS: Record<
  PackageCategory,
  { hotel: number; vehicle: number; driver: number; guide: number; food: number; taxRate: number; margin: number }
> = {
  domestic: { hotel: 3500, vehicle: 4500, driver: 1200, guide: 800, food: 900, taxRate: 0.05, margin: 0.18 },
  honeymoon: { hotel: 5500, vehicle: 5000, driver: 1200, guide: 600, food: 1200, taxRate: 0.05, margin: 0.22 },
  adventure: { hotel: 2800, vehicle: 4000, driver: 1000, guide: 1000, food: 800, taxRate: 0.05, margin: 0.15 },
  religious: { hotel: 2200, vehicle: 3800, driver: 1000, guide: 900, food: 700, taxRate: 0.05, margin: 0.12 },
  family: { hotel: 3200, vehicle: 4200, driver: 1100, guide: 700, food: 950, taxRate: 0.05, margin: 0.16 },
  international: { hotel: 8000, vehicle: 6000, driver: 0, guide: 1500, food: 2000, taxRate: 0.08, margin: 0.2 },
};

export function calculatePackagePrice(input: {
  category: PackageCategory;
  durationDays: number;
  competitorPrice?: number;
  travelers?: number;
}): AIPriceBreakdown {
  const days = input.durationDays;
  const travelers = input.travelers ?? 2;
  const b = CATEGORY_BENCHMARKS[input.category];

  const hotelCost = Math.round(b.hotel * days * (travelers / 2));
  const vehicleCost = Math.round(b.vehicle * days);
  const driverCost = Math.round(b.driver * days);
  const guideCost = Math.round(b.guide * days);
  const foodCost = Math.round(b.food * days * travelers);
  const subtotal = hotelCost + vehicleCost + driverCost + guideCost + foodCost;
  const taxes = Math.round(subtotal * b.taxRate);
  const withTax = subtotal + taxes;
  const profitMargin = Math.round(withTax * b.margin);
  const basePrice = withTax + profitMargin;

  let finalSellingPrice = basePrice;
  if (input.competitorPrice) {
    finalSellingPrice = Math.round(
      Math.min(basePrice * 1.05, input.competitorPrice * 0.95)
    );
  }

  const discountPrice = Math.round(finalSellingPrice * 0.92);

  return {
    hotelCost,
    vehicleCost,
    driverCost,
    guideCost,
    foodCost,
    taxes,
    profitMargin,
    profitPercent: Math.round(b.margin * 100),
    basePrice,
    discountPrice,
    finalSellingPrice,
  };
}

export function priceFromCompetitor(
  competitor: AICompetitorData,
  category: PackageCategory,
  durationDays: number
): AIPriceBreakdown {
  return calculatePackagePrice({
    category,
    durationDays,
    competitorPrice: competitor.price,
  });
}
