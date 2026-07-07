import "server-only";

import { catalogEntryToBrowseHotel } from "@/lib/tripjack-hotels/catalog-browse";
import { listBrowsableIndiaHotelsPage } from "@/lib/tripjack-hotels/catalog-firestore";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";

export interface CatalogBrowsePageResult {
  hotels: NormalizedHotel[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  query: string;
  city: string;
}

export async function browseCatalogHotelsPaged(input: {
  page?: number;
  pageSize?: number;
  query?: string;
  city?: string;
  minStars?: number;
}): Promise<CatalogBrowsePageResult> {
  const result = await listBrowsableIndiaHotelsPage({
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 50,
    query: input.query,
    city: input.city,
    minStars: input.minStars,
  });

  return {
    hotels: result.entries.map(catalogEntryToBrowseHotel),
    page: result.page,
    pageSize: result.pageSize,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    query: input.query?.trim() ?? "",
    city: input.city?.trim() ?? "",
  };
}
