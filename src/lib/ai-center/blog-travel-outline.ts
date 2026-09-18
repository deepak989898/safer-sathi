import {
  buildDistanceSection,
  buildSafarSathiBookingCta,
  getDestinationBlogReference,
  resolveDestinationName,
  type DestinationBlogReference,
} from "@/lib/ai-center/blog-reference-data";
import { estimateWordCount } from "@/lib/ai-center/utils";

function expandToWordTarget(content: string, minWords: number, maxWords: number): string {
  const words = estimateWordCount(content);
  if (words >= minWords && words <= maxWords * 1.15) return content.trim();

  if (words > maxWords * 1.2) {
    const parts = content.split(/\n\n/);
    const kept: string[] = [];
    let count = 0;
    for (const part of parts) {
      const w = estimateWordCount(part);
      if (count + w > maxWords && kept.length > 8) break;
      kept.push(part);
      count += w;
    }
    return kept.join("\n\n").trim();
  }

  return content.trim();
}

function stayBullets(dest: string): {
  hotels: string;
  budget: string;
  family: string;
  honeymoon: string;
} {
  return {
    hotels: `${dest} offers mid-range and upscale hotels near main markets and transport hubs. Look for free breakfast, reliable Wi-Fi, and easy cab pickup — compare live options on Safar Sathi hotels before you pay.`,
    budget: `Budget hotels and guesthouses near bus stands or old-city areas keep costs low (often ₹800–₹2,000/night). Confirm AC/geyser, late check-in, and ID rules. Shared dorms work for solo travellers; private rooms suit couples on a tight budget.`,
    family: `Family hotels should have larger rooms or connecting options, elevator access, early breakfast, and proximity to attractions so kids avoid long transfers. Prioritise clean bathrooms, room service, and parking if you travel with your own car.`,
    honeymoon: `Honeymoon hotels and boutique stays focus on views, privacy, and evening ambience — lake-facing, hill-view, or beachfront rooms. Book early for peak season; ask about candlelight dinners, late checkout, and airport/station transfers.`,
  };
}

function costBands(ref: DestinationBlogReference): {
  travel: string;
  hotel: string;
  food: string;
  local: string;
} {
  return {
    travel: `Intercity travel is often the largest line item. Flights cost more but save days; trains and Volvo buses are cheaper for overnight hops. Round-trip travel commonly ranges ₹2,000–₹12,000+ per person depending on distance and season. Book early for long weekends.`,
    hotel: `Stay typically lands between ₹1,200–₹6,000 per night for mid-range rooms; luxury and honeymoon properties run higher. Overall lodging often matches the daily band of **${ref.avgBudgetPerDay}** when meals and local transport are included.`,
    food: `Meals at local restaurants and dhabas usually cost ₹300–₹800 per person per day; cafés and hotel dining push higher. Try regional specialities: ${ref.localFood}`,
    local: `Local transport (auto, app cab, day taxi, or scooter rental) often adds ₹500–₹2,500 per day. Shared sightseeing cabs cut costs for families; keep small cash for parking and short hops.`,
  };
}

function reachModes(
  ref: DestinationBlogReference,
  dest: string
): { bus: string; flight: string; train: string; taxi: string } {
  const base = ref.howToReach;
  return {
    bus: `Volvo and state-run buses connect major cities to ${dest}. Overnight coaches save a hotel night; confirm boarding point, luggage rules, and winter delay buffers. ${
      /bus|volvo/i.test(base) ? base : `Ask locally for the latest depot timings into ${dest}.`
    }`,
    flight: `Flying is fastest when ${dest} has a nearby airport or a hub within a few hours by road. Factor cab time from the airport into your plan. ${
      /airport|fly|flight/i.test(base)
        ? base
        : `Check nearest airports and combine with a pre-booked taxi to ${dest}.`
    }`,
    train: `Trains are comfortable for overnight travel into the nearest major junction serving ${dest}. Reserve berths early on IRCTC for weekends and festivals. ${
      /rail|train|junction/i.test(base)
        ? base
        : `Use the closest railhead, then continue by cab or bus.`
    }`,
    taxi: `Private taxis and shared cabs suit families, late arrivals, and hill or last-mile routes into ${dest}. Agree on a fare or use a metered/app rate; for multi-day sightseeing, a full-day cab is often better value than multiple short rides.`,
  };
}

/**
 * Canonical Safar Sathi travel blog outline (≈1000–1500 words):
 * How to Reach → Bus/Flight/Train/Taxi
 * Where to Stay → Hotels / Budget / Family / Honeymoon
 * What to Do → Places / Activities / Attractions
 * Cost → Travel / Hotel / Food / Local transport
 */
export function buildStructuredTravelGuide(
  keyword: string,
  destination: string | undefined,
  wordLimit: number
): string {
  const ref = getDestinationBlogReference(keyword, destination);
  const dest = resolveDestinationName(keyword, destination);
  const distanceBlock = buildDistanceSection(keyword);
  const reach = reachModes(ref, dest);
  const stay = stayBullets(dest);
  const cost = costBands(ref);
  const places = ref.attractions.slice(0, 4);
  const morePlaces = ref.attractions.slice(4);
  const activities = ref.activities;

  const minWords = Math.min(1000, wordLimit);
  const maxWords = Math.min(1500, Math.max(wordLimit, 1200));

  const sections: string[] = [
    `# ${keyword}`,

    `## Introduction

Planning **${keyword}**? **${dest}** in ${ref.state} is a practical trip when you lock transport, stay type, sightseeing, and daily budget early. This guide follows a clear structure travellers actually use: **How to Reach**, **Where to Stay**, **What to Do**, and **Cost** — with enough detail to plan a ${dest} itinerary of about 3–5 nights without guesswork.`,

    distanceBlock ?? "",

    `## Best Time To Visit

${ref.bestTime}

Match your dates to weather and crowds: peak festivals raise hotel rates, while shoulder months often give better value for the same sights.`,

    `## How to Reach

Getting to **${dest}** is usually a mix of long-haul and last-mile options. Pick the mode that fits your time, budget, and group size.

### Bus

${reach.bus}

### Flight

${reach.flight}

### Train

${reach.train}

### Taxi

${reach.taxi}`,

    `## Where to Stay

Where you sleep shapes the whole trip — commute time, morning starts, and evening comfort. Use Safar Sathi hotel search to filter by budget and stay style for **${dest}**.

### Hotels

${stay.hotels}

### Budget hotels

${stay.budget}

### Family hotels

${stay.family}

### Honeymoon hotels

${stay.honeymoon}`,

    `## What to Do

Balance iconic sights with one or two slower experiences so days do not feel rushed.

### Places

Must-see places around **${dest}** include:
${places.map((p) => `- ${p}`).join("\n")}${
      morePlaces.length
        ? `\n\nAlso worth shortlisting if you have an extra day:\n${morePlaces.map((p) => `- ${p}`).join("\n")}`
        : ""
    }

### Activities

Hands-on and outdoor activities:
${activities.map((a) => `- ${a}`).join("\n")}

Pair one adventure or cultural activity with relaxed evenings so energy lasts the full trip.

### Attractions

Top attractions to prioritise (buy tickets early where required):
${ref.attractions.map((a) => `- ${a}`).join("\n")}

Carry water, comfortable shoes, and photo ID — many monuments and adventure desks ask for ID at entry.`,

    `## Cost

A realistic **${dest}** budget separates travel, hotel, food, and local transport. Typical combined mid-range spend is often around **${ref.avgBudgetPerDay}**, excluding long-haul flights when those are booked separately.

### Travel cost

${cost.travel}

### Hotel cost

${cost.hotel}

### Food cost

${cost.food}

### Local transport

${cost.local}

**Sample 3-night mid-range total (per person, indicative):** travel share + 3 hotel nights + meals + local cabs often lands in a wide band — tighten it by choosing bus/train over flights, budget or family hotels over luxury, and shared sightseeing instead of private cars all day.`,

    `## Local Food & Culture

${ref.localFood}

Ask hotels for trusted evening restaurants and avoid empty late-night stretches if you are new to the area.`,

    `## Travel Tips

${ref.travelTips.map((t) => `- ${t}`).join("\n")}
- Keep digital and physical copies of tickets and hotel confirmations
- Compare packages, hotels, and vehicles on Safar Sathi before paying`,

    `## FAQ

**How many days are enough for ${dest}?**
Most first-time visitors plan 3–5 nights to cover main places, activities, and one buffer day for travel delays.

**Is ${dest} suitable for families and couples?**
Yes — pick family hotels for space and convenience, or honeymoon hotels for quieter views; both work when you plan How to Reach and Cost in advance.

**Can I book ${dest} stays and cabs online?**
Yes — compare hotel, cab, and itinerary inclusions on Safar Sathi before payment.`,

    `## Conclusion

A clear plan for **How to Reach**, **Where to Stay**, **What to Do**, and **Cost** makes **${keyword}** easier and safer. Use the subsections above as a checklist, then lock tickets and rooms when prices look right. Safar Sathi helps you compare live options when you are ready to book.`,

    buildSafarSathiBookingCta(dest),
  ].filter(Boolean);

  return expandToWordTarget(sections.join("\n\n"), minWords, maxWords);
}

/** Short outline block for AI prompts. */
export function travelOutlinePromptStructure(): string {
  return `STRUCTURE (each ## heading once only; use ### for nested items exactly as listed):
1. Introduction
2. Best Time To Visit (optional but recommended)
3. How to Reach
   ### Bus
   ### Flight
   ### Train
   ### Taxi
4. Where to Stay
   ### Hotels
   ### Budget hotels
   ### Family hotels
   ### Honeymoon hotels
5. What to Do
   ### Places
   ### Activities
   ### Attractions
6. Cost
   ### Travel cost
   ### Hotel cost
   ### Food cost
   ### Local transport
7. Local Food & Culture (short)
8. Travel Tips
9. FAQ (3 questions)
10. Conclusion
11. Book on Safar Sathi (Safar Sathi URLs only)

Target 1000–1500 words. Write full paragraphs under each ### — not one-liners. No Sources section. No external booking links.`;
}

/** True when content already has the required nested travel outline. */
export function hasStructuredTravelOutline(content: string): boolean {
  const c = content.toLowerCase();
  return (
    c.includes("## how to reach") &&
    c.includes("### bus") &&
    c.includes("## where to stay") &&
    c.includes("### budget hotels") &&
    c.includes("## what to do") &&
    c.includes("### places") &&
    c.includes("## cost") &&
    c.includes("### travel cost") &&
    c.includes("### local transport")
  );
}
