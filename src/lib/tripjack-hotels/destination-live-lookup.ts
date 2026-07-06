import "server-only";

import type { DestinationResolveResult } from "@/lib/tripjack-hotels/catalog-types";
import { matchFallbackDestinationLabel } from "@/lib/tripjack-hotels/destination-fallback";

/** Legacy live static scan removed — V3 catalog must be synced into Firestore first. */
export async function resolveDestinationFromLiveCatalog(
  destination: string
): Promise<DestinationResolveResult> {
  const query = destination.trim();
  const fallbackLabel = matchFallbackDestinationLabel(query.toLowerCase());
  return {
    query,
    matchType: "none",
    label: fallbackLabel || query,
    hids: [],
    totalMatched: 0,
    truncated: false,
  };
}
