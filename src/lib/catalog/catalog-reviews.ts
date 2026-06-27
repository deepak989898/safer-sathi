import type { LocalizedString, Review, ServiceType } from "@/types";

const REVIEWER_NAMES = [
  "Priya Sharma",
  "Rahul Mehta",
  "Anita Desai",
  "Vikram Singh",
  "Sneha Reddy",
  "Arjun Patel",
  "Kavita Nair",
  "Mohit Agarwal",
  "Deepa Iyer",
  "Sanjay Kumar",
  "Meera Joshi",
  "Rohit Malhotra",
  "Pooja Verma",
  "Amit Bhatt",
  "Neha Kapoor",
  "Harish Menon",
  "Lakshmi Rao",
  "Karan Dhawan",
  "Isha Gupta",
  "Tarun Shah",
  "Rajesh Verma",
  "Sunita Devi",
  "Manish Tiwari",
  "Divya Krishnan",
  "Suresh Pillai",
  "Anjali Chopra",
  "Gaurav Saxena",
  "Rekha Bansal",
  "Naveen Joshi",
  "Shalini Rao",
  "Aditya Khanna",
  "Preeti Malhotra",
  "Rakesh Yadav",
  "Swati Deshmukh",
  "Varun Nair",
  "Komal Shah",
  "Harshvardhan Singh",
  "Nisha Gupta",
  "Abhishek Pandey",
  "Tanvi Mehta",
] as const;

const VEHICLE_COMMENTS: ReadonlyArray<{ en: string; hi: string }> = [
  {
    en: "Clean vehicle, punctual driver, and smooth ride throughout our trip.",
    hi: "साफ वाहन, समय पर ड्राइवर और पूरी यात्रा में आरामदायक सफर।",
  },
  {
    en: "Professional chauffeur and well-maintained car. Would book again.",
    hi: "पेशेवर चालक और अच्छी हालत में कार। फिर बुक करूँगा।",
  },
  {
    en: "Great value for money. Driver knew the routes well and was very courteous.",
    hi: "पैसे की अच्छी value। ड्राइवर को रास्ते अच्छे से पता थे और व्यवहार बहुत अच्छा था।",
  },
  {
    en: "Spacious and comfortable for our family. Safar Sathi handled everything smoothly.",
    hi: "परिवार के लिए spacious और comfortable। Safar Sathi ने सब कुछ आसानी से manage किया।",
  },
  {
    en: "On-time pickup and drop. Vehicle matched exactly what was shown on the website.",
    hi: "समय पर pickup और drop। वाहन बिल्कुल वैसा ही था जैसा website पर दिखाया गया था।",
  },
  {
    en: "Excellent AC and legroom. Driver was helpful with luggage and local tips.",
    hi: "बढ़िया AC और legroom। ड्राइवर luggage और local tips में मददगार था।",
  },
  {
    en: "Used this vehicle for a weekend getaway — hassle-free booking and great service.",
    hi: "weekend getaway के लिए यह वाहन use किया — आसान booking और शानदार service।",
  },
  {
    en: "Reliable rental with transparent pricing. No hidden charges at all.",
    hi: "विश्वसनीय rental, पारदर्शी pricing। कोई hidden charge नहीं।",
  },
];

const HOTEL_COMMENTS: ReadonlyArray<{ en: string; hi: string }> = [
  {
    en: "Comfortable stay with friendly staff and clean rooms.",
    hi: "आरामदायक stay, मिलनसार staff और साफ कमरे।",
  },
  {
    en: "Great location and breakfast was excellent. Check-in was quick.",
    hi: "बढ़िया location और breakfast excellent था। check-in जल्दी हुआ।",
  },
  {
    en: "Room was exactly as described. Housekeeping was attentive every day.",
    hi: "कमरा बिल्कुल वैसा ही था जैसा बताया गया। housekeeping हर दिन attentive थी।",
  },
  {
    en: "Booked through Safar Sathi at a better rate than other sites. Very happy.",
    hi: "Safar Sathi से दूसरी sites से बेहतर rate पर book किया। बहुत खुश।",
  },
  {
    en: "Peaceful atmosphere and good amenities. Would recommend to friends.",
    hi: "शांत माहौल और अच्छी amenities। दोस्तों को recommend करूँगा।",
  },
  {
    en: "Staff went out of their way to help with early check-in. Memorable stay.",
    hi: "early check-in में मदद के लिए staff ने extra effort की। यादगार stay।",
  },
  {
    en: "Views from the room were stunning. Worth every rupee.",
    hi: "कमरे से views शानदार थे। हर रुपये के लायक।",
  },
  {
    en: "Family-friendly property with spacious rooms and good food options.",
    hi: "family-friendly property, spacious rooms और अच्छे food options।",
  },
];

const PACKAGE_COMMENTS: ReadonlyArray<{ en: string; hi: string }> = [
  {
    en: "Well-organized itinerary with knowledgeable guides and comfortable stays.",
    hi: "अच्छी तरह organize itinerary, जानकार guides और comfortable stays।",
  },
  {
    en: "Every detail was handled — transport, hotels, and sightseeing. Stress-free trip.",
    hi: "हर detail handle हुई — transport, hotels और sightseeing। stress-free trip।",
  },
  {
    en: "Exceeded expectations. Safar Sathi team was responsive on WhatsApp throughout.",
    hi: "उम्मीद से बेहतर। Safar Sathi team पूरी यात्रा WhatsApp पर responsive रही।",
  },
  {
    en: "Perfect for our family vacation. Kids loved the activities included in the package.",
    hi: "परिवार की vacation के लिए perfect। बच्चों को package की activities बहुत पसंद आईं।",
  },
  {
    en: "Transparent pricing and instant confirmation. Highly recommend this package.",
    hi: "पारदर्शी pricing और instant confirmation। इस package की सिफारिश करता हूँ।",
  },
  {
    en: "Scenic routes and well-planned stops. Guide shared great local insights.",
    hi: "सुंदर routes और well-planned stops। guide ने local insights share किए।",
  },
  {
    en: "Honeymoon trip was magical — romantic stays and smooth transfers.",
    hi: "honeymoon trip magical थी — romantic stays और smooth transfers।",
  },
  {
    en: "Value for money package with no surprises. Will book another tour soon.",
    hi: "value for money package, कोई surprise नहीं। जल्दी एक और tour book करूँगा।",
  },
];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function distributeRatings(averageRating: number, count: number, seed: number): number[] {
  const targetSum = Math.round(averageRating * count);
  const ratings = Array.from({ length: count }, () => 5);
  let currentSum = count * 5;
  const rng = createRng(seed);
  let guard = 0;

  while (currentSum > targetSum && guard < count * 20) {
    const idx = Math.floor(rng() * count);
    if (ratings[idx] > 1) {
      ratings[idx] -= 1;
      currentSum -= 1;
    }
    guard += 1;
  }

  guard = 0;
  while (currentSum < targetSum && guard < count * 20) {
    const idx = Math.floor(rng() * count);
    if (ratings[idx] < 5) {
      ratings[idx] += 1;
      currentSum += 1;
    }
    guard += 1;
  }

  for (let i = ratings.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ratings[i], ratings[j]] = [ratings[j], ratings[i]];
  }

  return ratings;
}

function commentPool(serviceType: ServiceType) {
  if (serviceType === "vehicle" || serviceType === "car_rental" || serviceType === "tempo_traveller") {
    return VEHICLE_COMMENTS;
  }
  if (serviceType === "hotel") return HOTEL_COMMENTS;
  return PACKAGE_COMMENTS;
}

function personalizeComment(
  template: { en: string; hi: string },
  entityName: string,
  serviceType: ServiceType
): LocalizedString {
  const label =
    serviceType === "vehicle" || serviceType === "car_rental" || serviceType === "tempo_traveller"
      ? "vehicle"
      : serviceType === "hotel"
        ? "hotel"
        : "package";

  return {
    en: `${template.en} (${entityName} ${label})`,
    hi: `${template.hi} (${entityName} ${label})`,
  };
}

export interface CatalogReviewInput {
  serviceType: ServiceType;
  serviceId: string;
  entityName: string;
  rating: number;
  reviewCount: number;
}

export function generateCatalogReviews(input: CatalogReviewInput): Review[] {
  const { serviceType, serviceId, entityName, rating, reviewCount } = input;
  if (reviewCount <= 0) return [];

  const seed = hashSeed(`${serviceType}:${serviceId}`);
  const rng = createRng(seed);
  const ratings = distributeRatings(rating, reviewCount, seed + 17);
  const comments = commentPool(serviceType);
  const now = Date.now();

  return ratings.map((starRating, index) => {
    const nameIndex = (seed + index * 13) % REVIEWER_NAMES.length;
    const commentIndex = (seed + index * 7) % comments.length;
    const daysAgo = Math.floor(rng() * 730);
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `cat-rev-${serviceId}-${index}`,
      userId: `user-${serviceId}-${index}`,
      userName: REVIEWER_NAMES[nameIndex],
      serviceType,
      serviceId,
      rating: starRating,
      comment: personalizeComment(comments[commentIndex], entityName, serviceType),
      createdAt,
    };
  });
}

export function entityReviewsPath(serviceType: ServiceType, serviceId: string): string {
  return `/reviews/${serviceType}/${encodeURIComponent(serviceId)}`;
}

export function getSiteWideFallbackReviews(limit = 20): Review[] {
  const samples: CatalogReviewInput[] = [
    {
      serviceType: "package",
      serviceId: "pkg-golden-triangle",
      entityName: "Golden Triangle Tour",
      rating: 4.8,
      reviewCount: 12,
    },
    {
      serviceType: "vehicle",
      serviceId: "veh-toyota-innova-crysta",
      entityName: "Toyota Innova Crysta",
      rating: 4.8,
      reviewCount: 8,
    },
    {
      serviceType: "hotel",
      serviceId: "htl-taj-palace-delhi",
      entityName: "Taj Palace Hotel",
      rating: 4.9,
      reviewCount: 10,
    },
  ];

  const reviews: Review[] = [];
  for (const sample of samples) {
    reviews.push(...generateCatalogReviews(sample));
  }

  return reviews.slice(0, limit);
}
