import type { Hotel, HotelRoom, LocalizedString } from "@/types";

function enHi(en: string, hi?: string): LocalizedString {
  return { en, hi: hi ?? en };
}

const AMENITIES = [
  "Pool",
  "Spa",
  "Free WiFi",
  "Restaurant",
  "Gym",
  "Parking",
  "Room Service",
  "Air Conditioning",
  "Breakfast",
  "Laundry",
];

interface HotelSeedConfig {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  country?: string;
  location: string;
  address: string;
  price: number;
  starRating: number;
  rating: number;
  reviewCount: number;
  featured?: boolean;
  description: string;
}

function imagePaths(slug: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => `/images/hotels/${slug}/${n}.jpg`);
}

function buildRooms(hotelId: string, base: number): HotelRoom[] {
  return [
    {
      id: `${hotelId}-standard`,
      name: enHi("Standard Room", "स्टैंडर्ड रूम"),
      type: "standard",
      pricePerNight: Math.round(base * 0.85),
      maxGuests: 2,
      available: true,
      amenities: ["AC", "TV", "WiFi"],
      images: [],
    },
    {
      id: `${hotelId}-deluxe`,
      name: enHi("Deluxe Room", "डीलक्स रूम"),
      type: "deluxe",
      pricePerNight: base,
      maxGuests: 2,
      available: true,
      amenities: ["AC", "TV", "Mini Bar", "WiFi"],
      images: [],
    },
    {
      id: `${hotelId}-family`,
      name: enHi("Family Room", "फैमिली रूम"),
      type: "family",
      pricePerNight: Math.round(base * 1.35),
      maxGuests: 4,
      available: true,
      amenities: ["AC", "TV", "WiFi", "Extra Bed"],
      images: [],
    },
    {
      id: `${hotelId}-suite`,
      name: enHi("Suite Room", "सुइट रूम"),
      type: "suite",
      pricePerNight: Math.round(base * 1.75),
      maxGuests: 2,
      available: true,
      amenities: ["AC", "TV", "Mini Bar", "WiFi", "Living Area"],
      images: [],
    },
  ];
}

function buildHotel(cfg: HotelSeedConfig): Hotel {
  const now = new Date().toISOString();
  const country = cfg.country ?? "India";
  return {
    id: cfg.id,
    slug: cfg.slug,
    name: enHi(cfg.name),
    starRating: cfg.starRating,
    location: cfg.location,
    address: cfg.address,
    city: cfg.city,
    state: cfg.state,
    country,
    images: imagePaths(cfg.slug),
    amenities: [...AMENITIES],
    description: enHi(cfg.description),
    priceFrom: cfg.price,
    rooms: buildRooms(cfg.id, cfg.price),
    rating: cfg.rating,
    reviewCount: cfg.reviewCount,
    featured: cfg.featured ?? cfg.starRating >= 5,
    status: "active",
    available: true,
    createdAt: now,
    updatedAt: now,
  };
}

const HOTEL_CONFIGS: HotelSeedConfig[] = [
  // Delhi
  { id: "htl-taj-palace-delhi", slug: "taj-palace-delhi", name: "Taj Palace Hotel", city: "Delhi", state: "Delhi", location: "Diplomatic Enclave", address: "Sardar Patel Marg, Chanakyapuri, New Delhi", price: 8500, starRating: 5, rating: 4.9, reviewCount: 890, description: "Iconic 5-star luxury in Delhi's diplomatic enclave with lush gardens and world-class dining." },
  { id: "htl-leela-palace-delhi", slug: "leela-palace-delhi", name: "The Leela Palace", city: "Delhi", state: "Delhi", location: "Chanakyapuri", address: "Africa Avenue, Diplomatic Enclave, New Delhi", price: 15000, starRating: 5, rating: 4.9, reviewCount: 720, featured: true, description: "Palatial luxury hotel inspired by Lutyens' Delhi with impeccable service and fine dining." },
  { id: "htl-itc-maurya", slug: "itc-maurya-delhi", name: "ITC Maurya", city: "Delhi", state: "Delhi", location: "Chanakyapuri", address: "Sardar Patel Marg, New Delhi", price: 12000, starRating: 5, rating: 4.8, reviewCount: 654, description: "Legendary luxury hotel home to award-winning restaurants and business facilities." },
  { id: "htl-radisson-blu-dwarka", slug: "radisson-blu-dwarka", name: "Radisson Blu Dwarka", city: "Delhi", state: "Delhi", location: "Dwarka", address: "Plot 4, Sector 13, Dwarka, New Delhi", price: 7000, starRating: 4, rating: 4.5, reviewCount: 412, description: "Modern business hotel near IGI Airport with contemporary rooms and meeting spaces." },
  { id: "htl-the-park-delhi", slug: "the-park-delhi", name: "The Park Delhi", city: "Delhi", state: "Delhi", location: "Connaught Place", address: "15 Parliament Street, New Delhi", price: 6000, starRating: 4, rating: 4.4, reviewCount: 378, description: "Boutique lifestyle hotel in the heart of Connaught Place with vibrant nightlife." },
  // Agra
  { id: "htl-taj-view-agra", slug: "taj-view-agra", name: "Taj View Hotel", city: "Agra", state: "Uttar Pradesh", location: "Taj Ganj", address: "Fatehabad Road, Agra", price: 6500, starRating: 5, rating: 4.7, reviewCount: 534, description: "Taj-view rooms and gardens minutes from the Taj Mahal." },
  { id: "htl-crystal-sarovar", slug: "crystal-sarovar-agra", name: "Crystal Sarovar", city: "Agra", state: "Uttar Pradesh", location: "Fatehabad Road", address: "Fatehabad Road, Agra", price: 5500, starRating: 4, rating: 4.5, reviewCount: 298, description: "Comfortable stay with rooftop dining and Taj Mahal views." },
  { id: "htl-grand-mercure-agra", slug: "grand-mercure-agra", name: "Grand Mercure Agra", city: "Agra", state: "Uttar Pradesh", location: "Taj Ganj", address: "Fatehabad Road, Agra", price: 6000, starRating: 4, rating: 4.6, reviewCount: 321, description: "International standard hotel with pool and multi-cuisine restaurant." },
  // Jaipur
  { id: "htl-raj-palace-jaipur", slug: "raj-palace-jaipur", name: "Raj Palace Jaipur", city: "Jaipur", state: "Rajasthan", location: "Amer Road", address: "Jorawar Singh Gate, Amer Road, Jaipur", price: 11000, starRating: 5, rating: 4.8, reviewCount: 445, description: "Heritage palace hotel with royal suites and antique-filled interiors." },
  { id: "htl-rambagh-palace", slug: "rambagh-palace-jaipur", name: "Rambagh Palace", city: "Jaipur", state: "Rajasthan", location: "Bhawani Singh Road", address: "Bhawani Singh Road, Jaipur", price: 25000, starRating: 5, rating: 4.9, reviewCount: 312, featured: true, description: "Former royal residence turned ultra-luxury Taj palace in the Pink City." },
  { id: "htl-trident-jaipur", slug: "trident-jaipur", name: "Trident Jaipur", city: "Jaipur", state: "Rajasthan", location: "Amer", address: "Amber Fort Road, Jaipur", price: 8500, starRating: 5, rating: 4.7, reviewCount: 389, description: "Mughal-inspired architecture with views of Mansagar Lake and Amber Fort." },
  { id: "htl-hilton-jaipur", slug: "hilton-jaipur", name: "Hilton Jaipur", city: "Jaipur", state: "Rajasthan", location: "Bais Godam", address: "Ashram Marg, Bais Godam, Jaipur", price: 7000, starRating: 5, rating: 4.6, reviewCount: 267, description: "Contemporary luxury with rooftop pool and city skyline views." },
  // Udaipur
  { id: "htl-taj-lake-palace", slug: "taj-lake-palace", name: "Taj Lake Palace", city: "Udaipur", state: "Rajasthan", location: "Lake Pichola", address: "Lake Pichola, Udaipur", price: 28000, starRating: 5, rating: 4.9, reviewCount: 278, featured: true, description: "Floating marble palace on Lake Pichola — one of India's most romantic hotels." },
  { id: "htl-oberoi-udaivilas", slug: "oberoi-udaivilas", name: "Oberoi Udaivilas", city: "Udaipur", state: "Rajasthan", location: "Lake Pichola", address: "Haridasji Ki Magri, Udaipur", price: 40000, starRating: 5, rating: 4.9, reviewCount: 198, featured: true, description: "Award-winning lakeside resort with domed architecture and private pools." },
  { id: "htl-trident-udaipur", slug: "trident-udaipur", name: "Trident Udaipur", city: "Udaipur", state: "Rajasthan", location: "Lake Pichola", address: "Near Lake Pichola, Udaipur", price: 9000, starRating: 5, rating: 4.7, reviewCount: 356, description: "White marble hotel on Lake Pichola with Aravalli views." },
  // Jodhpur
  { id: "htl-umaid-bhawan", slug: "umaid-bhawan-jodhpur", name: "Umaid Bhawan Palace", city: "Jodhpur", state: "Rajasthan", location: "Circuit House Road", address: "Circuit House Road, Jodhpur", price: 35000, starRating: 5, rating: 4.9, reviewCount: 234, featured: true, description: "Art Deco palace hotel managed by Taj — royal heritage at its finest." },
  { id: "htl-radisson-jodhpur", slug: "radisson-jodhpur", name: "Radisson Jodhpur", city: "Jodhpur", state: "Rajasthan", location: "Paota", address: "Paota Circle, Jodhpur", price: 7000, starRating: 4, rating: 4.5, reviewCount: 189, description: "Modern hotel near the Blue City with pool and spa." },
  // Jaisalmer
  { id: "htl-suryagarh", slug: "suryagarh-jaisalmer", name: "Suryagarh Palace", city: "Jaisalmer", state: "Rajasthan", location: "Sam Road", address: "Kahala Phata, Sam Road, Jaisalmer", price: 14000, starRating: 5, rating: 4.8, reviewCount: 167, description: "Desert fortress hotel with dunes dining and cultural experiences." },
  { id: "htl-desert-tulip", slug: "desert-tulip-jaisalmer", name: "Desert Tulip", city: "Jaisalmer", state: "Rajasthan", location: "Fort Road", address: "Fort Road, Jaisalmer", price: 6000, starRating: 4, rating: 4.4, reviewCount: 145, description: "Comfortable base for exploring the Golden Fort and desert safaris." },
  // Goa
  { id: "htl-taj-fort-aguada", slug: "taj-fort-aguada", name: "Taj Fort Aguada", city: "Goa", state: "Goa", location: "Candolim", address: "Sinquerim, Candolim, Goa", price: 18000, starRating: 5, rating: 4.8, reviewCount: 512, description: "Clifftop resort overlooking the Arabian Sea and historic fort." },
  { id: "htl-grand-hyatt-goa", slug: "grand-hyatt-goa", name: "Grand Hyatt Goa", city: "Goa", state: "Goa", location: "Bambolim", address: "Bambolim, Goa", price: 22000, starRating: 5, rating: 4.8, reviewCount: 423, featured: true, description: "Sprawling beachfront resort with lagoon pools and world-class spa." },
  { id: "htl-planet-hollywood", slug: "planet-hollywood-goa", name: "Planet Hollywood Goa", city: "Goa", state: "Goa", location: "Utorda Beach", address: "Utorda Beach, South Goa", price: 12000, starRating: 5, rating: 4.6, reviewCount: 298, description: "Glamorous beach resort with Hollywood-themed suites and nightlife." },
  { id: "htl-novotel-goa", slug: "novotel-goa", name: "Novotel Goa", city: "Goa", state: "Goa", location: "Candolim", address: "Pinto Waddo, Candolim, Goa", price: 9000, starRating: 4, rating: 4.5, reviewCount: 334, description: "Family-friendly resort near Candolim Beach with kids' activities." },
  { id: "htl-hard-rock-goa", slug: "hard-rock-goa", name: "Hard Rock Goa", city: "Goa", state: "Goa", location: "Calangute", address: "Calangute, North Goa", price: 14000, starRating: 5, rating: 4.6, reviewCount: 267, description: "Music-themed resort with rock memorabilia and lively entertainment." },
  // Kerala
  { id: "htl-kumarakom-lake", slug: "kumarakom-lake-resort", name: "Kumarakom Lake Resort", city: "Kumarakom", state: "Kerala", location: "Vembanad Lake", address: "Kumarakom, Kottayam, Kerala", price: 18000, starRating: 5, rating: 4.9, reviewCount: 389, featured: true, description: "Heritage lake resort with pool villas and houseboat experiences." },
  { id: "htl-spice-village", slug: "spice-village-thekkady", name: "Spice Village Thekkady", city: "Thekkady", state: "Kerala", location: "Periyar", address: "Thekkady, Idukki, Kerala", price: 8000, starRating: 4, rating: 4.6, reviewCount: 312, description: "Eco-friendly tribal village resort near Periyar Wildlife Sanctuary." },
  { id: "htl-fragrant-nature", slug: "fragrant-nature-kochi", name: "Fragrant Nature Kochi", city: "Kochi", state: "Kerala", location: "Maradu", address: "Maradu, Kochi, Kerala", price: 10000, starRating: 5, rating: 4.7, reviewCount: 245, description: "Waterfront luxury with backwater views and Ayurvedic spa." },
  { id: "htl-blanket-munnar", slug: "blanket-hotel-munnar", name: "Blanket Hotel Munnar", city: "Munnar", state: "Kerala", location: "Chithirapuram", address: "Chithirapuram, Munnar, Kerala", price: 6000, starRating: 4, rating: 4.5, reviewCount: 198, description: "Hill station retreat surrounded by tea plantations and misty valleys." },
  // Mumbai
  { id: "htl-taj-mahal-palace", slug: "taj-mahal-palace-mumbai", name: "Taj Mahal Palace", city: "Mumbai", state: "Maharashtra", location: "Colaba", address: "Apollo Bunder, Colaba, Mumbai", price: 30000, starRating: 5, rating: 4.9, reviewCount: 678, featured: true, description: "Mumbai's legendary harbour-front palace hotel since 1903." },
  { id: "htl-oberoi-mumbai", slug: "oberoi-mumbai", name: "The Oberoi Mumbai", city: "Mumbai", state: "Maharashtra", location: "Nariman Point", address: "Nariman Point, Mumbai", price: 28000, starRating: 5, rating: 4.9, reviewCount: 534, featured: true, description: "Sea-facing luxury tower with panoramic views of the Arabian Sea." },
  { id: "htl-trident-nariman", slug: "trident-nariman-point", name: "Trident Nariman Point", city: "Mumbai", state: "Maharashtra", location: "Nariman Point", address: "Nariman Point, Mumbai", price: 12000, starRating: 5, rating: 4.7, reviewCount: 412, description: "Business-friendly luxury on Marine Drive with harbour views." },
  { id: "htl-jw-marriott-mumbai", slug: "jw-marriott-mumbai", name: "JW Marriott Mumbai", city: "Mumbai", state: "Maharashtra", location: "Juhu", address: "Juhu Tara Road, Juhu, Mumbai", price: 15000, starRating: 5, rating: 4.8, reviewCount: 389, description: "Beachfront luxury at Juhu with award-winning dining." },
  // Bangalore
  { id: "htl-leela-bangalore", slug: "leela-bangalore", name: "The Leela Bangalore", city: "Bangalore", state: "Karnataka", location: "Old Airport Road", address: "Old Airport Road, Bangalore", price: 18000, starRating: 5, rating: 4.8, reviewCount: 356, description: "Garden oasis in the city with championship golf and spa." },
  { id: "htl-itc-gardenia", slug: "itc-gardenia-bangalore", name: "ITC Gardenia", city: "Bangalore", state: "Karnataka", location: "Residency Road", address: "Residency Road, Bangalore", price: 14000, starRating: 5, rating: 4.7, reviewCount: 298, description: "Eco-luxury hotel with vertical gardens and sustainable practices." },
  { id: "htl-taj-mg-road", slug: "taj-mg-road-bangalore", name: "Taj MG Road", city: "Bangalore", state: "Karnataka", location: "MG Road", address: "41/3 MG Road, Bangalore", price: 8000, starRating: 5, rating: 4.6, reviewCount: 267, description: "Central Bangalore landmark with classic Taj hospitality." },
  // Shimla
  { id: "htl-wildflower-hall", slug: "wildflower-hall-shimla", name: "Wildflower Hall", city: "Shimla", state: "Himachal Pradesh", location: "Mashobra", address: "Chharabra, Mashobra, Shimla", price: 22000, starRating: 5, rating: 4.9, reviewCount: 178, featured: true, description: "Oberoi hill retreat with Himalayan views and adventure activities." },
  { id: "htl-radisson-shimla", slug: "radisson-shimla", name: "Radisson Shimla", city: "Shimla", state: "Himachal Pradesh", location: "Goodwood Estate", address: "Goodwood Estate, Shimla", price: 7000, starRating: 4, rating: 4.5, reviewCount: 234, description: "Hill station hotel with heated pool and mountain vistas." },
  { id: "htl-clarkes-shimla", slug: "clarkes-hotel-shimla", name: "Clarkes Hotel", city: "Shimla", state: "Himachal Pradesh", location: "The Mall", address: "The Mall, Shimla", price: 5500, starRating: 4, rating: 4.4, reviewCount: 189, description: "Heritage hotel on the Mall Road since the colonial era." },
  // Manali
  { id: "htl-manuallaya", slug: "manuallaya-resort-manali", name: "Manuallaya Resort", city: "Manali", state: "Himachal Pradesh", location: "Hadimba Road", address: "Hadimba Road, Manali", price: 12000, starRating: 5, rating: 4.7, reviewCount: 212, description: "Alpine-style resort with spa and snow-capped mountain views." },
  { id: "htl-the-himalayan", slug: "the-himalayan-manali", name: "The Himalayan", city: "Manali", state: "Himachal Pradesh", location: "Hadimba", address: "Hadimba, Manali", price: 10000, starRating: 4, rating: 4.6, reviewCount: 167, description: "Castle-themed boutique property with valley and forest views." },
  { id: "htl-apple-country", slug: "apple-country-resort-manali", name: "Apple Country Resort", city: "Manali", state: "Himachal Pradesh", location: "Log Huts", address: "Log Huts Area, Manali", price: 6500, starRating: 4, rating: 4.4, reviewCount: 145, description: "Orchard resort with apple blossoms and cozy mountain cottages." },
  // Darjeeling
  { id: "htl-mayfair-darjeeling", slug: "mayfair-darjeeling", name: "Mayfair Darjeeling", city: "Darjeeling", state: "West Bengal", location: "The Mall", address: "The Mall, Darjeeling", price: 9000, starRating: 5, rating: 4.6, reviewCount: 198, description: "Heritage hill hotel with colonial charm and Kanchenjunga views." },
  { id: "htl-summit-swiss", slug: "summit-swiss-heritage", name: "Summit Swiss Heritage", city: "Darjeeling", state: "West Bengal", location: "The Mall", address: "15 Gandhi Road, Darjeeling", price: 6000, starRating: 4, rating: 4.4, reviewCount: 156, description: "Swiss-inspired heritage property on Mall Road." },
  // Gangtok
  { id: "htl-elgin-nor-khill", slug: "elgin-nor-khill", name: "Elgin Nor Khill", city: "Gangtok", state: "Sikkim", location: "The Mall", address: "The Mall, Gangtok", price: 8500, starRating: 4, rating: 4.6, reviewCount: 178, description: "Heritage hotel with Sikkimese architecture and mountain views." },
  { id: "htl-summit-golden", slug: "summit-golden-crescent", name: "Summit Golden Crescent", city: "Gangtok", state: "Sikkim", location: "MG Marg", address: "MG Marg, Gangtok", price: 5500, starRating: 4, rating: 4.4, reviewCount: 134, description: "Comfortable stay near MG Marg with valley views." },
  // Srinagar
  { id: "htl-lalit-grand", slug: "lalit-grand-palace-srinagar", name: "Lalit Grand Palace", city: "Srinagar", state: "Jammu & Kashmir", location: "Gupkar Road", address: "Gupkar Road, Srinagar", price: 15000, starRating: 5, rating: 4.8, reviewCount: 245, description: "Former maharaja's palace on Dal Lake with Chinar gardens." },
  { id: "htl-vivanta-dal", slug: "vivanta-dal-view", name: "Vivanta Dal View", city: "Srinagar", state: "Jammu & Kashmir", location: "Kralsangri", address: "Kralsangri, Srinagar", price: 9000, starRating: 5, rating: 4.6, reviewCount: 198, description: "Hilltop hotel with panoramic Dal Lake and Zabarwan views." },
  { id: "htl-houseboat-royal", slug: "houseboat-royal-group", name: "Houseboat Royal Group", city: "Srinagar", state: "Jammu & Kashmir", location: "Dal Lake", address: "Dal Lake, Srinagar", price: 7000, starRating: 4, rating: 4.5, reviewCount: 312, description: "Authentic Kashmiri houseboat experience on Dal Lake." },
  // Andaman
  { id: "htl-seashell-resort", slug: "seashell-resort-andaman", name: "Seashell Resort", city: "Port Blair", state: "Andaman & Nicobar", location: "Haddo", address: "Haddo, Port Blair", price: 9500, starRating: 4, rating: 4.6, reviewCount: 267, description: "Beachfront resort gateway to Andaman island adventures." },
  { id: "htl-symphony-samudra", slug: "symphony-samudra", name: "Symphony Samudra", city: "Port Blair", state: "Andaman & Nicobar", location: "Corbyn's Cove", address: "Corbyn's Cove, Port Blair", price: 8000, starRating: 4, rating: 4.5, reviewCount: 189, description: "Sea-facing resort near Corbyn's Cove Beach." },
  // Ooty
  { id: "htl-savoy-ihcl", slug: "savoy-ihcl-ooty", name: "Savoy IHCL", city: "Ooty", state: "Tamil Nadu", location: "Sylk", address: "Sylk, Ooty", price: 11000, starRating: 5, rating: 4.7, reviewCount: 234, description: "Colonial-era hill station luxury since the British Raj." },
  { id: "htl-fortune-ooty", slug: "fortune-resort-ooty", name: "Fortune Resort", city: "Ooty", state: "Tamil Nadu", location: "Fern Hill", address: "Fern Hill, Ooty", price: 6500, starRating: 4, rating: 4.4, reviewCount: 167, description: "Garden resort in the Nilgiris with cozy fireside evenings." },
  // Kanyakumari
  { id: "htl-sparsa-resort", slug: "sparsa-resort-kanyakumari", name: "Sparsa Resort", city: "Kanyakumari", state: "Tamil Nadu", location: "Beach Road", address: "Beach Road, Kanyakumari", price: 5500, starRating: 4, rating: 4.4, reviewCount: 145, description: "Southern tip resort with sunrise and sunset ocean views." },
  { id: "htl-sea-view-kanyakumari", slug: "sea-view-hotel-kanyakumari", name: "Sea View Hotel", city: "Kanyakumari", state: "Tamil Nadu", location: "Main Road", address: "Main Road, Kanyakumari", price: 4500, starRating: 3, rating: 4.2, reviewCount: 112, description: "Budget-friendly stay with views of the three seas confluence." },
  // Rameshwaram
  { id: "htl-daiwik", slug: "daiwik-hotel-rameshwaram", name: "Daiwik Hotel", city: "Rameshwaram", state: "Tamil Nadu", location: "Temple Road", address: "Temple Road, Rameshwaram", price: 6000, starRating: 4, rating: 4.5, reviewCount: 178, description: "Pilgrim-friendly hotel near Ramanathaswamy Temple." },
  { id: "htl-hyatt-place-rameshwaram", slug: "hyatt-place-rameshwaram", name: "Hyatt Place", city: "Rameshwaram", state: "Tamil Nadu", location: "Madurai Road", address: "Madurai Rameshwaram Road, Rameshwaram", price: 7500, starRating: 4, rating: 4.6, reviewCount: 156, description: "Modern comfort for spiritual travellers to Rameshwaram." },
  // International
  { id: "htl-atlantis-dubai", slug: "atlantis-dubai", name: "Atlantis Dubai", city: "Dubai", state: "Dubai", country: "UAE", location: "Palm Jumeirah", address: "Crescent Road, Palm Jumeirah, Dubai", price: 45000, starRating: 5, rating: 4.9, reviewCount: 890, featured: true, description: "Iconic Palm Jumeirah resort with Aquaventure Waterpark and underwater suites." },
  { id: "htl-marina-bay-sands", slug: "marina-bay-sands-singapore", name: "Marina Bay Sands", city: "Singapore", state: "Singapore", country: "Singapore", location: "Marina Bay", address: "10 Bayfront Avenue, Singapore", price: 50000, starRating: 5, rating: 4.9, reviewCount: 756, featured: true, description: "Architectural marvel with infinity rooftop pool and skyline views." },
  { id: "htl-hard-rock-bali", slug: "hard-rock-bali", name: "Hard Rock Bali", city: "Bali", state: "Bali", country: "Indonesia", location: "Kuta", address: "Jalan Pantai Kuta, Bali", price: 22000, starRating: 5, rating: 4.7, reviewCount: 534, description: "Beachfront rock-themed resort on famous Kuta Beach." },
  { id: "htl-sun-siyam-maldives", slug: "sun-siyam-maldives", name: "Sun Siyam Maldives", city: "Maldives", state: "Maldives", country: "Maldives", location: "South Malé Atoll", address: "Olhuveli, South Malé Atoll, Maldives", price: 55000, starRating: 5, rating: 4.9, reviewCount: 412, featured: true, description: "Overwater villas and turquoise lagoons in paradise." },
];

export function getHotelsSeed(): Hotel[] {
  return HOTEL_CONFIGS.map(buildHotel);
}

export const HOTELS_SEED_COUNT = HOTEL_CONFIGS.length;

export const HOTEL_SEED_SLUGS = HOTEL_CONFIGS.map((h) => h.slug);
