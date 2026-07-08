import type {
  NormalizedHotelDetail,
  NormalizedHotelOption,
  NormalizedHotelPricing,
  NormalizedHotelReviewResult,
} from "@/lib/tripjack-hotels/types";

export interface HotelOptionPricingAuditRow {
  optionId: string;
  roomNames: string[];
  mealBasis: string;
  mealBasisLabel: string;
  isRefundable: boolean;
  totalPrice: number;
  apiTotalPrice: number;
  basePrice: number;
  taxes: number;
  mf: number;
  mft: number;
  strikethroughPrice?: number;
  commercialType: string;
  commission: number;
  customerMarkup: number;
  currency: string;
}

export function buildOptionPricingAuditRow(option: NormalizedHotelOption): HotelOptionPricingAuditRow {
  const p = option.pricing;
  return {
    optionId: option.optionId,
    roomNames: option.roomInfo.length ? option.roomInfo : [option.roomName],
    mealBasis: option.mealBasis,
    mealBasisLabel: option.mealBasisLabel,
    isRefundable: option.isRefundable,
    totalPrice: p.totalPrice,
    apiTotalPrice: p.apiTotalPrice ?? p.totalPrice,
    basePrice: p.basePrice,
    taxes: p.taxes,
    mf: p.mf,
    mft: p.mft,
    strikethroughPrice: p.strikethroughPrice,
    commercialType: option.commercialType,
    commission: option.commission,
    customerMarkup: p.customerMarkup ?? 0,
    currency: p.currency,
  };
}

export function applyMarkupToPricing(
  pricing: NormalizedHotelPricing,
  markupPercent: number
): NormalizedHotelPricing {
  const apiTotal = pricing.apiTotalPrice ?? pricing.totalPrice;
  const percent = Math.max(0, markupPercent);
  if (percent <= 0) {
    return {
      ...pricing,
      apiTotalPrice: apiTotal,
      totalPrice: apiTotal,
      customerMarkup: 0,
    };
  }

  const markup = Math.round((apiTotal * percent) / 100);
  return {
    ...pricing,
    apiTotalPrice: apiTotal,
    customerMarkup: markup,
    totalPrice: apiTotal + markup,
  };
}

function applyMarkupToOption(
  option: NormalizedHotelOption,
  markupPercent: number
): NormalizedHotelOption {
  return {
    ...option,
    pricing: applyMarkupToPricing(option.pricing, markupPercent),
  };
}

export function applyHotelMarkupToDetail(
  detail: NormalizedHotelDetail,
  markupPercent: number
): NormalizedHotelDetail {
  const options = detail.options
    .map((option) => applyMarkupToOption(option, markupPercent))
    .sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);

  return {
    ...detail,
    options,
  };
}

export function applyHotelMarkupToReview(
  review: NormalizedHotelReviewResult,
  markupPercent: number
): NormalizedHotelReviewResult {
  return {
    ...review,
    option: applyMarkupToOption(review.option, markupPercent),
  };
}
