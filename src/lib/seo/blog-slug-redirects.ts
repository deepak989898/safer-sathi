/**
 * Legacy AI city-keyword blog posts were indexed then removed from Firestore.
 * Map those dead /blog/{slug} URLs to the closest live page (301/308).
 */

const EXACT_REDIRECTS: Record<string, string> = {
  "orai-to-ahmedabad-tour": "/packages/golden-triangle",
  "orai-to-ahmedabad-trip": "/packages/golden-triangle",
  "orai-to-kerala-package": "/packages/kerala-backwater",
  "orai-to-manali-train-ticket-price": "/packages/himachal-adventure",
  "orai-to-rishikesh-tour": "/packages/kedarnath-yatra",
  "orai-to-coorg-tour": "/packages/ooty-mysore",
  "orai-to-ooty-trip": "/packages/ooty-mysore",
  "group-tour-from-orai": "/packages",
  "bus-service-orai": "/bus/search",
  "best-places-to-visit-in-haridwar": "/packages/kedarnath-yatra",
};

const DESTINATION_PACKAGE: Array<{ match: RegExp; path: string }> = [
  { match: /\b(kerala|alleppey|munnar|kochi|cochin)\b/, path: "/packages/kerala-backwater" },
  { match: /\b(manali|shimla|himachal|kullu)\b/, path: "/packages/himachal-adventure" },
  { match: /\b(goa|calangute|baga)\b/, path: "/packages/goa-beach" },
  { match: /\b(kashmir|srinagar|gulmarg|pahalgam)\b/, path: "/packages/kashmir-paradise" },
  {
    match: /\b(jaipur|udaipur|jodhpur|rajasthan|ahmedabad|agra|delhi)\b/,
    path: "/packages/golden-triangle",
  },
  { match: /\b(ooty|mysore|coorg|coorgh)\b/, path: "/packages/ooty-mysore" },
  { match: /\b(rishikesh|haridwar|kedarnath|badrinath)\b/, path: "/packages/kedarnath-yatra" },
  { match: /\b(darjeeling|gangtok|sikkim)\b/, path: "/packages/darjeeling-gangtok" },
  { match: /\b(andaman|port-blair)\b/, path: "/packages/andaman-island" },
  { match: /\b(meghalaya|shillong|cherrapunji)\b/, path: "/packages/meghalaya" },
  { match: /\b(vaishno|katra)\b/, path: "/packages/vaishno-devi" },
  { match: /\b(rameshwaram)\b/, path: "/packages/rameshwaram" },
  { match: /\b(kanyakumari)\b/, path: "/packages/kanyakumari" },
  { match: /\b(lakshadweep)\b/, path: "/packages/lakshadweep" },
  { match: /\b(dubai)\b/, path: "/packages/dubai" },
  { match: /\b(thailand|bangkok|phuket)\b/, path: "/packages/thailand" },
  { match: /\b(singapore)\b/, path: "/packages/singapore" },
  { match: /\b(bali)\b/, path: "/packages/bali" },
  { match: /\b(maldives)\b/, path: "/packages/maldives-honeymoon" },
];

/** Returns a permanent redirect target for a missing blog slug, or null. */
export function resolveBlogSlugRedirect(slug: string): string | null {
  const normalized = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!normalized) return null;

  if (EXACT_REDIRECTS[normalized]) return EXACT_REDIRECTS[normalized];

  // Transport intent
  if (
    /\b(bus-service|bus-ticket|volvo|train-ticket|railway|cab-service|taxi)\b/.test(normalized) ||
    /-(bus|train|volvo)(-|$)/.test(normalized)
  ) {
    if (/\b(cab|taxi|car-rental|car-hire)\b/.test(normalized)) return "/vehicles";
    return "/bus/search";
  }

  if (/\b(hotel|hotels|stay|resort)\b/.test(normalized)) return "/hotels";

  // Destination-aware package mapping (covers orai-to-*, *-tour, *-package, *-trip)
  for (const rule of DESTINATION_PACKAGE) {
    if (rule.match.test(normalized)) return rule.path;
  }

  // Origin-only city SEO blogs (group-tour-from-X, X-tour-packages)
  if (
    /^(group-tour-from-|tour-packages-from-|holiday-from-|travel-from-)/.test(normalized) ||
    /-(tour-packages|holiday-packages)$/.test(normalized)
  ) {
    return "/packages";
  }

  // Places-to-visit / travel guide style
  if (/\b(places-to-visit|travel-guide|itinerary|best-time-to-visit)\b/.test(normalized)) {
    return "/blog";
  }

  // Any remaining AI-style "{origin}-to-{dest}-*" city keyword posts
  if (/-to-/.test(normalized) && /\b(tour|trip|package|holiday|travel)\b/.test(normalized)) {
    return "/packages";
  }

  return null;
}
