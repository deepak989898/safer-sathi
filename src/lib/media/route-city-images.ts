export type ImageSlotType =
  | "featured"
  | "destination"
  | "activity"
  | "attraction"
  | "experience";

export interface DestinationImageAsset {
  id: string;
  label: string;
  type: ImageSlotType;
  url: string;
  attraction?: string;
}

export interface DestinationImageCategory {
  key: string;
  displayName: string;
  images: DestinationImageAsset[];
}

function img(photoId: string, w = 1920): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&q=80&auto=format&fit=crop`;
}

const PUNE: DestinationImageAsset[] = [
  { id: "pune-hero", label: "Pune City Skyline", type: "featured", url: img("1570168007207-dfb528211588"), attraction: "Pune" },
  { id: "pune-shaniwar", label: "Shaniwar Wada", type: "attraction", url: img("1605647542434-bl9883d0b863"), attraction: "Shaniwar Wada" },
  { id: "pune-ghat", label: "Western Ghats near Pune", type: "destination", url: img("1464822759023-fed622b2a3ba"), attraction: "Lonavala" },
  { id: "pune-fort", label: "Sinhagad Fort", type: "attraction", url: img("1518548419970-58e984b6eb4c"), attraction: "Sinhagad Fort" },
  { id: "pune-food", label: "Pune Street Food", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Local Food" },
  { id: "pune-campus", label: "Pune City Life", type: "destination", url: img("1590454022651-4c6f2c8f9632"), attraction: "City Tour" },
];

const LUCKNOW: DestinationImageAsset[] = [
  { id: "lucknow-hero", label: "Lucknow Heritage", type: "featured", url: img("1605647542434-bl9883d0b863"), attraction: "Lucknow" },
  { id: "lucknow-imambara", label: "Bara Imambara", type: "attraction", url: img("1580730512125-32c4d3dba365"), attraction: "Bara Imambara" },
  { id: "lucknow-chowk", label: "Chowk Bazaar", type: "experience", url: img("1587474260584-1acab24d2d54"), attraction: "Chowk" },
  { id: "lucknow-food", label: "Awadhi Cuisine", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Kebabs" },
  { id: "lucknow-park", label: "Ambedkar Park", type: "attraction", url: img("1477587456223-d9cfcede3a2f"), attraction: "Ambedkar Park" },
  { id: "lucknow-mosque", label: "Lucknow Architecture", type: "destination", url: img("1518548419970-58e984b6eb4c"), attraction: "Heritage" },
];

const MUMBAI: DestinationImageAsset[] = [
  { id: "mumbai-hero", label: "Gateway of India", type: "featured", url: img("1569773718642-d72c3d2a5b1d"), attraction: "Gateway of India" },
  { id: "mumbai-marine", label: "Marine Drive", type: "attraction", url: img("1529254055708-5348b6be2aaa"), attraction: "Marine Drive" },
  { id: "mumbai-local", label: "Mumbai Local Train", type: "experience", url: img("1515169065187-8b7f3e8c4b0e"), attraction: "Local Train" },
  { id: "mumbai-beach", label: "Juhu Beach", type: "destination", url: img("1507525428034-b723cf961d3e"), attraction: "Juhu Beach" },
  { id: "mumbai-market", label: "Colaba Market", type: "experience", url: img("1555884680-155aeeea010c"), attraction: "Colaba" },
  { id: "mumbai-skyline", label: "Mumbai Skyline", type: "destination", url: img("1531366936339-94c690b16626"), attraction: "South Mumbai" },
];

const AGRA: DestinationImageAsset[] = [
  { id: "agra-hero", label: "Taj Mahal", type: "featured", url: img("1564507594627-96a7058782aeb"), attraction: "Taj Mahal" },
  { id: "agra-fort", label: "Agra Fort", type: "attraction", url: img("1599661047819-382153ed0aac"), attraction: "Agra Fort" },
  { id: "agra-garden", label: "Mehtab Bagh", type: "destination", url: img("1580730512125-32c4d3dba365"), attraction: "Mehtab Bagh" },
  { id: "agra-street", label: "Agra Old City", type: "experience", url: img("1609137144323-b4cbcec4b5c0"), attraction: "Old City" },
  { id: "agra-craft", label: "Marble Craft", type: "activity", url: img("1587474260584-1acab24d2d54"), attraction: "Handicrafts" },
];

const HYDERABAD: DestinationImageAsset[] = [
  { id: "hyd-hero", label: "Charminar Hyderabad", type: "featured", url: img("1596178060811-fe763986a14a"), attraction: "Charminar" },
  { id: "hyd-golconda", label: "Golconda Fort", type: "attraction", url: img("1609137144323-b4cbcec4b5c0"), attraction: "Golconda Fort" },
  { id: "hyd-lake", label: "Hussain Sagar", type: "destination", url: img("1587474260584-1acab24d2d54"), attraction: "Hussain Sagar" },
  { id: "hyd-biryani", label: "Hyderabadi Biryani", type: "experience", url: img("1582719478250-c89cae4dc85b"), attraction: "Biryani" },
];

const BANGALORE: DestinationImageAsset[] = [
  { id: "blr-hero", label: "Bangalore City", type: "featured", url: img("1590454022651-4c6f2c8f9632"), attraction: "Bengaluru" },
  { id: "blr-palace", label: "Bangalore Palace", type: "attraction", url: img("1605647542434-bl9883d0b863"), attraction: "Bangalore Palace" },
  { id: "blr-garden", label: "Lalbagh Garden", type: "destination", url: img("1570168007207-dfb528211588"), attraction: "Lalbagh" },
  { id: "blr-tech", label: "Modern Bengaluru", type: "experience", url: img("1531366936339-94c690b16626"), attraction: "City Life" },
];

const CHENNAI: DestinationImageAsset[] = [
  { id: "chennai-hero", label: "Marina Beach Chennai", type: "featured", url: img("1583416988777-b92432eccee0"), attraction: "Marina Beach" },
  { id: "chennai-temple", label: "Kapaleeshwarar Temple", type: "attraction", url: img("1548013146-72479768bada"), attraction: "Temple" },
  { id: "chennai-fort", label: "Fort St George", type: "attraction", url: img("1596178060811-fe763986a14a"), attraction: "Fort St George" },
];

const KOLKATA: DestinationImageAsset[] = [
  { id: "kolkata-hero", label: "Howrah Bridge", type: "featured", url: img("1555884680-155aeeea010c"), attraction: "Howrah Bridge" },
  { id: "kolkata-victoria", label: "Victoria Memorial", type: "attraction", url: img("1580730512125-32c4d3dba365"), attraction: "Victoria Memorial" },
  { id: "kolkata-tram", label: "Kolkata Tram", type: "experience", url: img("1515169065187-8b7f3e8c4b0e"), attraction: "Tram" },
];

const VARANASI: DestinationImageAsset[] = [
  { id: "varanasi-hero", label: "Ganga Ghats Varanasi", type: "featured", url: img("1548013146-72479768bada"), attraction: "Ghats" },
  { id: "varanasi-aarti", label: "Ganga Aarti", type: "experience", url: img("1596496181924-3568d664d3ae"), attraction: "Ganga Aarti" },
  { id: "varanasi-boat", label: "Boat Ride", type: "activity", url: img("1537953773395-29b1661fff74"), attraction: "Boat Ride" },
];

const AMRITSAR: DestinationImageAsset[] = [
  { id: "amritsar-hero", label: "Golden Temple", type: "featured", url: img("1580730512125-32c4d3dba365"), attraction: "Golden Temple" },
  { id: "amritsar-wagah", label: "Wagah Border", type: "attraction", url: img("1609137144323-b4cbcec4b5c0"), attraction: "Wagah Border" },
];

const CHANDIGARH: DestinationImageAsset[] = [
  { id: "chandigarh-hero", label: "Rock Garden Chandigarh", type: "featured", url: img("1605100805443-9343f8229746"), attraction: "Rock Garden" },
  { id: "chandigarh-lake", label: "Sukhna Lake", type: "destination", url: img("1570168007207-dfb528211588"), attraction: "Sukhna Lake" },
];

const NAINITAL: DestinationImageAsset[] = [
  { id: "nainital-hero", label: "Nainital Lake", type: "featured", url: img("1602210294080-0fdf9a24f935"), attraction: "Naini Lake" },
  { id: "nainital-hills", label: "Kumaon Hills", type: "destination", url: img("1506905925346-21bda4d32df4"), attraction: "Hills" },
];

export const TRANSPORT_CAB: DestinationImageAsset[] = [
  { id: "cab-sedan", label: "Sedan Taxi", type: "featured", url: img("1552519507-da3b142c6e3d"), attraction: "Cab" },
  { id: "cab-suv", label: "SUV Cab", type: "featured", url: img("1618843479313-40f8afb4b4d8"), attraction: "SUV Taxi" },
  { id: "cab-road", label: "Highway Road Trip", type: "destination", url: img("1469854523086-cc02fe5d8800"), attraction: "Highway" },
  { id: "cab-innova", label: "Innova Crysta", type: "experience", url: img("1549317661-bd32c8ce0db2"), attraction: "Innova" },
  { id: "cab-driver", label: "Chauffeur Service", type: "experience", url: img("1494976388531-d1058494cdd8"), attraction: "Driver" },
];

export const TRANSPORT_BUS: DestinationImageAsset[] = [
  { id: "bus-volvo", label: "Volvo Bus", type: "featured", url: img("1544620347-c4fd4a3d5957"), attraction: "Volvo Bus" },
  { id: "bus-travel", label: "Bus Journey", type: "experience", url: img("1570125909232-eb263c188f7e"), attraction: "Bus Travel" },
  { id: "bus-highway", label: "Highway Bus", type: "destination", url: img("1469854523086-cc02fe5d8800"), attraction: "Intercity Bus" },
  { id: "bus-terminal", label: "Bus Terminal", type: "experience", url: img("1555884680-155aeeea010c"), attraction: "ISBT" },
];

export const TRANSPORT_TRAIN: DestinationImageAsset[] = [
  { id: "train-express", label: "Indian Railways", type: "featured", url: img("1515169065187-8b7f3e8c4b0e"), attraction: "Train" },
  { id: "train-station", label: "Railway Station", type: "destination", url: img("1477587456223-d9cfcede3a2f"), attraction: "Railway Station" },
  { id: "train-window", label: "Scenic Train Journey", type: "experience", url: img("1506905925346-21bda4d32df4"), attraction: "Train Journey" },
  { id: "train-tickets", label: "Train Travel", type: "experience", url: img("1544620347-c4fd4a3d5957"), attraction: "IRCTC" },
];

export const TRANSPORT_PACKAGE: DestinationImageAsset[] = [
  { id: "pkg-hero", label: "Tour Package", type: "featured", url: img("1582719478250-c89cae4dc85b"), attraction: "Tour Package" },
  { id: "pkg-sightseeing", label: "Sightseeing Tour", type: "activity", url: img("1464822759023-fed622b2a3ba"), attraction: "Sightseeing" },
  { id: "pkg-hotel", label: "Package Stay", type: "experience", url: img("1566073771259-6a8506099945"), attraction: "Hotel Stay" },
  { id: "pkg-group", label: "Group Tour", type: "experience", url: img("1507525428034-b723cf961d3e"), attraction: "Group Travel" },
];

export const ROUTE_CITY_CATALOG: Record<string, DestinationImageCategory> = {
  pune: { key: "pune", displayName: "Pune", images: PUNE },
  lucknow: { key: "lucknow", displayName: "Lucknow", images: LUCKNOW },
  mumbai: { key: "mumbai", displayName: "Mumbai", images: MUMBAI },
  agra: { key: "agra", displayName: "Agra", images: AGRA },
  hyderabad: { key: "hyderabad", displayName: "Hyderabad", images: HYDERABAD },
  bangalore: { key: "bangalore", displayName: "Bangalore", images: BANGALORE },
  bengaluru: { key: "bengaluru", displayName: "Bengaluru", images: BANGALORE },
  chennai: { key: "chennai", displayName: "Chennai", images: CHENNAI },
  kolkata: { key: "kolkata", displayName: "Kolkata", images: KOLKATA },
  varanasi: { key: "varanasi", displayName: "Varanasi", images: VARANASI },
  amritsar: { key: "amritsar", displayName: "Amritsar", images: AMRITSAR },
  chandigarh: { key: "chandigarh", displayName: "Chandigarh", images: CHANDIGARH },
  nainital: { key: "nainital", displayName: "Nainital", images: NAINITAL },
  transport_cab: { key: "transport_cab", displayName: "Cab", images: TRANSPORT_CAB },
  transport_bus: { key: "transport_bus", displayName: "Bus", images: TRANSPORT_BUS },
  transport_train: { key: "transport_train", displayName: "Train", images: TRANSPORT_TRAIN },
  transport_package: { key: "transport_package", displayName: "Tour Package", images: TRANSPORT_PACKAGE },
};

export const ROUTE_CITY_ALIASES: Record<string, string> = {
  pune: "pune",
  lucknow: "lucknow",
  mumbai: "mumbai",
  bombay: "mumbai",
  agra: "agra",
  "taj mahal": "agra",
  taj: "agra",
  hyderabad: "hyderabad",
  charminar: "hyderabad",
  bangalore: "bangalore",
  bengaluru: "bengaluru",
  chennai: "chennai",
  madras: "chennai",
  kolkata: "kolkata",
  calcutta: "kolkata",
  varanasi: "varanasi",
  banaras: "varanasi",
  benares: "varanasi",
  amritsar: "amritsar",
  chandigarh: "chandigarh",
  nainital: "nainital",
  orai: "agra",
  kanpur: "lucknow",
  prayagraj: "varanasi",
  allahabad: "varanasi",
  noida: "delhi",
  gurgaon: "delhi",
  gurugram: "delhi",
};

export type BlogTravelMode = "cab" | "bus" | "train" | "package" | "destination";

export function detectBlogTravelMode(keyword: string, title = ""): BlogTravelMode {
  const haystack = `${keyword} ${title}`.toLowerCase();
  if (/\b(cab|cabs|taxi|car rental|innova|sedan|suv)\b/.test(haystack)) return "cab";
  if (/\b(bus|buses|volvo)\b/.test(haystack)) return "bus";
  if (/\b(train|trains|rail|irctc|railway)\b/.test(haystack)) return "train";
  if (/\b(tour package|package tour|holiday package|trip package)\b/.test(haystack)) {
    return "package";
  }
  if (/\b(package|tour)\b/.test(haystack)) return "package";
  return "destination";
}

function matchCityKey(text: string): string | null {
  const normalized = text.toLowerCase().replace(/\|.*$/, "").trim();
  const aliasEntries = Object.entries(ROUTE_CITY_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, key] of aliasEntries) {
    if (normalized.includes(alias)) return key;
  }
  for (const key of Object.keys(ROUTE_CITY_CATALOG)) {
    if (key.startsWith("transport_")) continue;
    if (normalized.includes(key)) return key;
  }
  return null;
}

export function extractRouteDestinationCity(keyword: string): string | null {
  const cleaned = keyword.toLowerCase().replace(/\|.*$/, "").trim();
  const routeMatch = cleaned.match(
    /\b(?:from\s+)?[a-z][\w\s]{1,40}?\s+to\s+([a-z][\w\s]{1,40}?)(?:\s+(?:cab|cabs|taxi|bus|buses|train|trains|package|tour|trip|distance|by\s+road|route|tickets?|fare|booking|irctc|volvo|car))?\b/i
  );
  if (routeMatch) {
    const cityPhrase = routeMatch[1].trim();
    return matchCityKey(cityPhrase) ?? matchCityKey(cityPhrase.split(/\s+/).pop() ?? "");
  }
  return null;
}
