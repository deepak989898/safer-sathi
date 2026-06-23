import { appUrl } from "@/lib/site-config";

export interface BlogReferenceLink {
  title: string;
  url: string;
}

export interface DestinationBlogReference {
  destination: string;
  state: string;
  bestTime: string;
  howToReach: string;
  localFood: string;
  attractions: string[];
  activities: string[];
  avgBudgetPerDay: string;
  travelTips: string[];
  references: BlogReferenceLink[];
}

const DEFAULT_REFERENCE: DestinationBlogReference = {
  destination: "India",
  state: "India",
  bestTime:
    "October to March is pleasant for most regions. Hill stations are best in summer (April–June) for snow-free travel; winter suits snow destinations.",
  howToReach:
    "Major cities connect by flight, train, and Volvo buses. Book trains on IRCTC and compare road transfers for hill routes.",
  localFood:
    "Regional thalis, street snacks, and seasonal produce vary by state — try local dhabas and licensed restaurants.",
  attractions: [
    "Heritage monuments and old-city markets",
    "Scenic viewpoints and nature parks",
    "Temples and cultural festivals",
  ],
  activities: ["Sightseeing", "Local food walks", "Photography", "Short treks"],
  avgBudgetPerDay: "₹2,500–₹6,000 per person (mid-range, excluding flights)",
  travelTips: [
    "Book hotels early for long weekends and festival dates",
    "Carry photo ID for hotel check-in",
    "Confirm road conditions in monsoon for hill stations",
  ],
  references: [
    {
      title: "Incredible India — Official Tourism",
      url: "https://www.incredibleindia.org/",
    },
    {
      title: "India travel guide (Wikipedia)",
      url: "https://en.wikipedia.org/wiki/Tourism_in_India",
    },
  ],
};

const DESTINATION_REFERENCES: Record<string, DestinationBlogReference> = {
  manali: {
    destination: "Manali",
    state: "Himachal Pradesh",
    bestTime:
      "March to June for pleasant weather and adventure sports; December to February for snow and skiing at Solang. Avoid heavy monsoon landslides (July–August) on mountain roads.",
    howToReach:
      "Nearest airport: Bhuntar (Kullu), ~50 km. Overnight Volvo buses from Delhi (~12–14 hrs). Chandigarh is a common rail/bus hub (~8–10 hrs by road).",
    localFood:
      "Siddu, trout fish, Himachali thali, momos, and warm apple cider in Old Manali cafés.",
    attractions: [
      "Hadimba Devi Temple (1553 AD cedar forest temple)",
      "Solang Valley — paragliding, zorbing, cable car",
      "Rohtang Pass / Atal Tunnel route (seasonal snow views)",
      "Old Manali village lanes and riverside cafés",
      "Vashisht hot water springs",
      "Naggar Castle and Roerich Art Gallery",
    ],
    activities: [
      "River rafting on Beas (May–June)",
      "Paragliding at Solang",
      "Snow activities in winter",
      "Day trips to Kasol, Naggar, or Jogini Falls trek",
    ],
    avgBudgetPerDay: "₹3,000–₹8,000 per person (stay + meals + local transport)",
    travelTips: [
      "Acclimatise one night before high-altitude day trips",
      "Carry warm layers even in summer for Rohtang",
      "Book permits/vehicles early for Rohtang in peak season",
      "Prefer daytime driving on Kullu–Manali highway",
    ],
    references: [
      { title: "Manali — Wikipedia", url: "https://en.wikipedia.org/wiki/Manali,_Himachal_Pradesh" },
      {
        title: "Himachal Pradesh Tourism",
        url: "https://hptdc.in/",
      },
      {
        title: "Rohtang Pass — Wikipedia",
        url: "https://en.wikipedia.org/wiki/Rohtang_Pass",
      },
    ],
  },
  jaipur: {
    destination: "Jaipur",
    state: "Rajasthan",
    bestTime:
      "November to February — cool and ideal for forts and markets. March is warm; April–June is very hot. Monsoon (July–Sept) has fewer crowds.",
    howToReach:
      "Jaipur International Airport (JAI). Jaipur Junction is well connected by Rajdhani/Shatabdi from Delhi (~4–5 hrs). NH48 highway from Delhi (~5 hrs).",
    localFood:
      "Dal baati churma, laal maas, ghewar, pyaaz kachori at Rawat Mishthan Bhandar, and rooftop dinners near Hawa Mahal.",
    attractions: [
      "Amber Fort and Jaigarh Fort",
      "Hawa Mahal and City Palace",
      "Jantar Mantar (UNESCO)",
      "Nahargarh Fort sunset views",
      "Johari Bazaar and Bapu Bazaar",
      "Albert Hall Museum",
    ],
    activities: [
      "Heritage walking tours in the Pink City",
      "Elephant/jeep ascent to Amber Fort",
      "Block-printing workshop in Sanganer",
      "Day trip to Ajmer–Pushkar or Abhaneri stepwell",
    ],
    avgBudgetPerDay: "₹2,500–₹7,000 per person",
    travelTips: [
      "Start fort visits early morning to avoid heat and crowds",
      "Bargain politely in bazaars; carry cash for small vendors",
      "Book licensed guides at official fort counters",
    ],
    references: [
      { title: "Jaipur — Wikipedia", url: "https://en.wikipedia.org/wiki/Jaipur" },
      { title: "Rajasthan Tourism", url: "https://www.tourism.rajasthan.gov.in/" },
      { title: "Amber Fort — Wikipedia", url: "https://en.wikipedia.org/wiki/Amer_Fort" },
    ],
  },
  goa: {
    destination: "Goa",
    state: "Goa",
    bestTime:
      "November to February — dry, sunny beach weather. Christmas–New Year is peak pricing. Monsoon (June–Sept) is lush and quiet.",
    howToReach:
      "Dabolim (GOI) and Mopa (GOX) airports. Madgaon and Thivim railway stations. Overnight buses from Mumbai/Bengaluru.",
    localFood:
      "Fish curry rice, xacuti, bebinca, prawn balchão, and beach shack grills.",
    attractions: [
      "Basilica of Bom Jesus (Old Goa, UNESCO)",
      "Fort Aguada and Candolim beaches",
      "Anjuna and Vagator cliffs",
      "Dudhsagar Falls (seasonal)",
      "Fontainhas Latin Quarter, Panaji",
      "Spice plantations in Ponda",
    ],
    activities: ["Water sports at Baga/Calangute", "Scuba at Grande Island", "Sunset cruises on Mandovi"],
    avgBudgetPerDay: "₹2,000–₹10,000 depending on beach vs luxury resort",
    travelTips: [
      "Rent scooters only with valid license and helmet",
      "North Goa for nightlife; South Goa for quieter beaches",
      "Book NYE stays months ahead",
    ],
    references: [
      { title: "Goa — Wikipedia", url: "https://en.wikipedia.org/wiki/Goa" },
      { title: "Goa Tourism", url: "https://www.goatourism.gov.in/" },
    ],
  },
  kashmir: {
    destination: "Kashmir",
    state: "Jammu & Kashmir",
    bestTime:
      "April to June for tulips and meadows; December–February for snow in Gulmarg. Autumn (Sept–Oct) for chinar colours.",
    howToReach:
      "Fly to Srinagar (SXR). Jammu Tawi railway then road to valley. Pre-paid taxis at airport.",
    localFood: "Rogan josh, yakhni, kahwa tea, and fresh bakery goods on Boulevard Road.",
    attractions: [
      "Dal Lake shikara rides",
      "Mughal Gardens (Nishat, Shalimar)",
      "Gulmarg gondola",
      "Pahalgam Betaab Valley",
      "Sonamarg meadows",
    ],
    activities: ["Shikara rides", "Gondola skiing", "Pony rides in valleys"],
    avgBudgetPerDay: "₹4,000–₹12,000 including houseboat stays",
    travelTips: [
      "Check local advisories before travel",
      "Book houseboats through registered operators",
      "Carry ID for security checkpoints",
    ],
    references: [
      { title: "Kashmir Valley — Wikipedia", url: "https://en.wikipedia.org/wiki/Kashmir_Valley" },
      { title: "J&K Tourism", url: "https://www.jktdc.co.in/" },
    ],
  },
  kerala: {
    destination: "Kerala",
    state: "Kerala",
    bestTime:
      "September to March for backwaters and beaches. Monsoon (June–Aug) is Ayurveda season with lush scenery.",
    howToReach:
      "Kochi (COK), Thiruvananthapuram (TRV), and Kozhikode airports. Ernakulam/TVC rail hubs.",
    localFood: "Appam with stew, Kerala sadya on banana leaf, karimeen pollichathu, and fresh coconut water.",
    attractions: [
      "Alleppey houseboat backwaters",
      "Munnar tea estates",
      "Fort Kochi Chinese fishing nets",
      "Periyar Wildlife Sanctuary",
      "Varkala cliff beach",
    ],
    activities: ["Houseboat cruises", "Kathakali performances", "Tea estate walks"],
    avgBudgetPerDay: "₹3,000–₹9,000",
    travelTips: [
      "Book houseboats with AC bedrooms for summer",
      "Carry rain gear in monsoon",
      "Respect temple dress codes",
    ],
    references: [
      { title: "Kerala — Wikipedia", url: "https://en.wikipedia.org/wiki/Kerala" },
      { title: "Kerala Tourism", url: "https://www.keralatourism.org/" },
    ],
  },
  shimla: {
    destination: "Shimla",
    state: "Himachal Pradesh",
    bestTime: "March–June and October–November. Winter for occasional snow on Mall Road.",
    howToReach: "Chandigarh airport/rail, then 3–4 hr mountain drive. Kalka–Shimla toy train (UNESCO).",
    localFood: "Chana madra, siddu, hot chocolate on Mall Road.",
    attractions: ["The Ridge and Mall Road", "Jakhoo Temple", "Christ Church", "Kufri day trip"],
    activities: ["Toy train ride", "Mall Road walks", "Kufri horse riding / snow play"],
    avgBudgetPerDay: "₹2,500–₹6,500",
    travelTips: ["Parking is limited on Mall Road — use hotel parking", "Book toy train tickets early"],
    references: [
      { title: "Shimla — Wikipedia", url: "https://en.wikipedia.org/wiki/Shimla" },
      { title: "Kalka–Shimla Railway", url: "https://en.wikipedia.org/wiki/Kalka%E2%80%93Shimla_Railway" },
    ],
  },
  rishikesh: {
    destination: "Rishikesh",
    state: "Uttarakhand",
    bestTime: "February–May and September–November. Rafting season roughly October–June.",
    howToReach: "Dehradun Jolly Grant airport (~20 km). Haridwar rail junction 25 km away.",
    localFood: "Ayurvedic cafés, North Indian thalis, and riverside vegetarian meals.",
    attractions: ["Laxman Jhula", "Beatles Ashram", "Triveni Ghat aarti", "Neer Garh waterfall"],
    activities: ["Ganga rafting", "Yoga retreats", "Bungee at Jumpin Heights"],
    avgBudgetPerDay: "₹2,000–₹7,000",
    travelTips: ["Alcohol non-vegetarian food restricted in core Rishikesh", "Wear life jackets during rafting"],
    references: [
      { title: "Rishikesh — Wikipedia", url: "https://en.wikipedia.org/wiki/Rishikesh" },
    ],
  },
  udaipur: {
    destination: "Udaipur",
    state: "Rajasthan",
    bestTime: "October–March. Monsoon fills lakes beautifully in July–August.",
    howToReach: "Maharana Pratap Airport (UDR). Udaipur City railway station.",
    localFood: "Dal baati, mirchi bada, lake-view rooftop thalis.",
    attractions: ["City Palace", "Lake Pichola boat ride", "Saheliyon-ki-Bari", "Sajjangarh Monsoon Palace"],
    activities: ["Sunset boat cruise", "Heritage walk", "Day trip to Kumbhalgarh Fort"],
    avgBudgetPerDay: "₹3,000–₹9,000",
    travelTips: ["Book lake-view hotels early in winter", "Carry scarf for palace temple areas"],
    references: [
      { title: "Udaipur — Wikipedia", url: "https://en.wikipedia.org/wiki/Udaipur" },
    ],
  },
  delhi: {
    destination: "Delhi",
    state: "Delhi",
    bestTime: "October–March. Avoid peak summer May–June heat.",
    howToReach: "Indira Gandhi International Airport. Major rail hubs: NDLS, NZM, Hazrat Nizamuddin.",
    localFood: "Parathas at Paranthe Wali Gali, butter chicken, chaat at Chandni Chowk.",
    attractions: ["Red Fort", "Qutub Minar", "Humayun's Tomb", "India Gate", "Lotus Temple"],
    activities: ["Heritage walks", "Metro sightseeing", "Akshardham visit"],
    avgBudgetPerDay: "₹2,000–₹8,000",
    travelTips: ["Use Delhi Metro for Old Delhi visits", "Stay hydrated and check AQI in winter"],
    references: [
      { title: "Delhi — Wikipedia", url: "https://en.wikipedia.org/wiki/Delhi" },
    ],
  },
};

const DESTINATION_ALIASES: Record<string, string> = {
  "old manali": "manali",
  kullu: "manali",
  solang: "manali",
  "pink city": "jaipur",
  srinagar: "kashmir",
  gulmarg: "kashmir",
  munnar: "kerala",
  alleppey: "kerala",
  kochi: "kerala",
  cochin: "kerala",
};

export function resolveDestinationName(keyword: string, explicit?: string): string {
  const haystack = `${keyword} ${explicit ?? ""}`.toLowerCase();
  for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
    if (haystack.includes(alias)) return DESTINATION_REFERENCES[key]?.destination ?? explicit ?? "India";
  }
  for (const key of Object.keys(DESTINATION_REFERENCES)) {
    if (haystack.includes(key)) return DESTINATION_REFERENCES[key].destination;
  }
  return explicit?.trim() || "India";
}

export function getDestinationBlogReference(
  keyword: string,
  explicitDestination?: string
): DestinationBlogReference {
  const haystack = `${keyword} ${explicitDestination ?? ""}`.toLowerCase();
  for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
    if (haystack.includes(alias) && DESTINATION_REFERENCES[key]) {
      return DESTINATION_REFERENCES[key];
    }
  }
  for (const [key, ref] of Object.entries(DESTINATION_REFERENCES)) {
    if (haystack.includes(key)) return ref;
  }
  if (explicitDestination) {
    return { ...DEFAULT_REFERENCE, destination: explicitDestination };
  }
  return DEFAULT_REFERENCE;
}

/** Distance-style keywords e.g. "Jaipur to Manali distance" */
export function buildDistanceSection(keyword: string): string | null {
  const match = keyword.match(
    /([\w\s]+?)\s+to\s+([\w\s]+?)(?:\s+distance|\s+by\s+road|\s+route)?/i
  );
  if (!match) return null;
  const from = match[1].trim();
  const to = match[2].trim();
  return `## Distance & Route Overview

The road distance from **${from}** to **${to}** is typically **480–540 km** via NH44 and NH3 (via Chandigarh), depending on the exact route and stops. Driving time is about **12–14 hours** without long breaks — most travellers split the journey with an overnight halt in Chandigarh or Mandi.

| Mode | Approx. time | Notes |
|------|----------------|-------|
| Self-drive / taxi | 12–14 hrs | Start early; avoid night driving on hills |
| Volvo bus | 14–16 hrs | Overnight from ISBT Delhi or ${from} |
| Flight + cab | 4–6 hrs total | Fly to Bhuntar/Kullu then 1.5–2 hr cab to ${to} |

**Best stopovers:** Chandigarh, Mandi, or Kullu for meals and fuel. Check live road status in monsoon and winter for landslides or snow near Rohtang/Atal Tunnel.`;
}

export function formatReferencesMarkdown(refs: BlogReferenceLink[]): string {
  if (!refs.length) return "";
  const lines = refs.map((r) => `- [${r.title}](${r.url})`);
  return `## Sources & Further Reading\n\n${lines.join("\n")}`;
}

/** Branded booking CTA — all links point to Safar Sathi only. */
export function buildSafarSathiBookingCta(destination?: string): string {
  const dest = destination?.trim() || "your destination";
  const site = appUrl();

  return `## Book on Safar Sathi

Ready to plan **${dest}**? Book directly on Safar Sathi — tour packages, hotels, vehicles, and bus tickets in one place:

- [Browse tour packages](${appUrl("/packages")})
- [Find hotels](${appUrl("/hotels")})
- [Rent a vehicle](${appUrl("/vehicles")})
- [AI Travel Assistant](${appUrl("/assistant")})
- [Start booking](${appUrl("/booking")})

All reservations are made on [Safar Sathi](${site}). We do not redirect you to third-party booking sites.`;
}
