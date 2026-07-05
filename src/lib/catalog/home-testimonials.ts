import { localizedText } from "@/lib/i18n";
import type { Locale, LocalizedString, Review, ServiceType } from "@/types";

export interface HomeTestimonial {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  tourLabel: string;
}

export const FALLBACK_TESTIMONIALS: ReadonlyArray<{
  id: string;
  userName: string;
  rating: number;
  comment: LocalizedString;
  tourLabel: string;
}> = [
  {
    id: "demo-1",
    userName: "Priya Sharma",
    rating: 5,
    comment: {
      en: "Excellent trip to Jaipur! The hotel was amazing and the guide was very knowledgeable. Highly recommend Safar Sathi for Rajasthan tours.",
      hi: "जयपुर की शानदार यात्रा! होटल बढ़िया था और गाइड बहुत जानकार था। राजस्थान टूर के लिए Safar Sathi की सिफारिश करती हूँ।",
    },
    tourLabel: "Jaipur Tour",
  },
  {
    id: "demo-2",
    userName: "Rahul Mehta",
    rating: 5,
    comment: {
      en: "Booked a tempo traveller for our family trip to Manali. Clean vehicle, punctual driver, and great pricing. Will book again!",
      hi: "मनाली परिवार यात्रा के लिए टेम्पो ट्रैवeller बुक किया। साफ वाहन, समय पर ड्राइवर और अच्छी कीमत। फिर बुक करूँगा!",
    },
    tourLabel: "Manali Trip",
  },
  {
    id: "demo-3",
    userName: "Anita Desai",
    rating: 5,
    comment: {
      en: "Kerala backwaters package exceeded expectations. Houseboat experience was magical. Safar Sathi made everything seamless.",
      hi: "केरल बैकवॉटर पैकेज उम्मीद से बेहतर रहा। हाउसबोट अनुभव जादुई था। Safar Sathi ने सब आसान बना दिया।",
    },
    tourLabel: "Kerala Package",
  },
  {
    id: "demo-4",
    userName: "Vikram Singh",
    rating: 5,
    comment: {
      en: "Goa hotel booking was smooth and the price was better than other sites. Support team replied quickly on WhatsApp.",
      hi: "गोवा होटल बुकिंग आसान रही और कीमत दूसरी साइटों से बेहतर थी। सपोर्ट टीम ने जल्दी जवाब दिया।",
    },
    tourLabel: "Goa Hotel",
  },
  {
    id: "demo-5",
    userName: "Sneha Reddy",
    rating: 5,
    comment: {
      en: "Our honeymoon in Shimla was perfectly planned. Romantic stays, scenic drives, and zero stress. Thank you Safar Sathi!",
      hi: "शिमला में हनीमून बिल्कुल सही प्लान हुआ। रोमांटिक स्टे, सुंदर ड्राइव और कोई टेंशन नहीं। धन्यवाद Safar Sathi!",
    },
    tourLabel: "Shimla Honeymoon",
  },
  {
    id: "demo-6",
    userName: "Arjun Patel",
    rating: 4,
    comment: {
      en: "Booked an Innova for Ahmedabad to Udaipur. Driver was professional and the car was well maintained.",
      hi: "अहमदाबाद से उदयपुर के लिए इनोवा बुक की। ड्राइवर प्रोफेशनल था और कार अच्छी हालत में थी।",
    },
    tourLabel: "Vehicle Rental",
  },
  {
    id: "demo-7",
    userName: "Kavita Nair",
    rating: 5,
    comment: {
      en: "Char Dham yatra package was well organized. Hotels were clean and darshan timings were managed perfectly.",
      hi: "चार धाम यात्रा पैकेज अच्छी तरह органize था। होटल साफ थे और दर्शन का समय perfect था।",
    },
    tourLabel: "Char Dham Yatra",
  },
  {
    id: "demo-8",
    userName: "Mohit Agarwal",
    rating: 5,
    comment: {
      en: "Last-minute Leh Ladakh booking and they delivered! Transparent pricing and instant invoice on email.",
      hi: "लास्ट मिनट लेह लद्दाख बुकिंग और उन्होंने deliver किया! पारदर्शी कीमत और तुरंत invoice।",
    },
    tourLabel: "Ladakh Adventure",
  },
  {
    id: "demo-9",
    userName: "Deepa Iyer",
    rating: 5,
    comment: {
      en: "Family of 12 traveled to Rishikesh. Tempo traveller was spacious and the whole trip was hassle-free.",
      hi: "12 लोगों का परिवार ऋषिकेश गया। टेंपो ट्रैवeller spacious था और पूरी यात्रा आसान रही।",
    },
    tourLabel: "Rishikesh Trip",
  },
  {
    id: "demo-10",
    userName: "Sanjay Kumar",
    rating: 4,
    comment: {
      en: "Good experience with bus booking to Delhi. Seats were comfortable and departure was on time.",
      hi: "दिल्ली बस बुकिंग का अच्छा अनुभव। सीटें आरामदायक थीं और समय पर रवानगी।",
    },
    tourLabel: "Bus Booking",
  },
  {
    id: "demo-11",
    userName: "Meera Joshi",
    rating: 5,
    comment: {
      en: "Munnar hotel stay was beautiful. Safar Sathi matched us with a great property at a fair price.",
      hi: "मुन्नार होटल स्टे बहुत सुंदर था। Safar Sathi ने अच्छी property सही कीमत पर दी।",
    },
    tourLabel: "Munnar Hotel",
  },
  {
    id: "demo-12",
    userName: "Rohit Malhotra",
    rating: 5,
    comment: {
      en: "Corporate offsite in Mussoorie — vehicles, hotel, and itinerary all handled in one place. Very efficient.",
      hi: "मसूरी में कॉर्पोरेट ऑफसाइट — वाहन, होटल और itinerary सब एक जगह। बहुत efficient।",
    },
    tourLabel: "Mussoorie Corporate",
  },
  {
    id: "demo-13",
    userName: "Pooja Verma",
    rating: 5,
    comment: {
      en: "AI assistant helped me pick the right package for parents. Booking took less than 10 minutes!",
      hi: "AI assistant ने माता-पिता के लिए सही पैकेज चुनने में मदद की। बुकिंग 10 मिनट से कम!",
    },
    tourLabel: "Golden Triangle",
  },
  {
    id: "demo-14",
    userName: "Amit Bhatt",
    rating: 4,
    comment: {
      en: "Airport pickup in Jaipur was on time despite late flight. Driver tracked my landing — impressive service.",
      hi: "जयपुर airport pickup late flight के बावजूद समय पर था। ड्राइवर ने landing track की — शानदार सेवा।",
    },
    tourLabel: "Airport Pickup",
  },
  {
    id: "demo-15",
    userName: "Neha Kapoor",
    rating: 5,
    comment: {
      en: "Andaman honeymoon package was dreamy. Snorkeling, beach resort, and candlelight dinner — all included.",
      hi: "अंडमान हनीमून पैकेज सपनों जैसा था। snorkeling, beach resort और candlelight dinner — सब included।",
    },
    tourLabel: "Andaman Honeymoon",
  },
  {
    id: "demo-16",
    userName: "Harish Menon",
    rating: 5,
    comment: {
      en: "Used Safar Sathi for three trips now. Consistent quality, honest pricing, and friendly support every time.",
      hi: "अब तक तीन यात्राओं के लिए Safar Sathi use किया। हर बार quality, कीमत और support बढ़िया।",
    },
    tourLabel: "Repeat Customer",
  },
  {
    id: "demo-17",
    userName: "Lakshmi Rao",
    rating: 5,
    comment: {
      en: "Pilgrimage tour to Varanasi was spiritually fulfilling. Guide knew every ghat and temple history.",
      hi: "वाराणसी तीर्थ यात्रा आध्यात्मिक रूप से fulfilling थी। गाइड को हर घाट और मंदिर की history पता थी।",
    },
    tourLabel: "Varanasi Pilgrimage",
  },
  {
    id: "demo-18",
    userName: "Karan Dhawan",
    rating: 4,
    comment: {
      en: "Weekend getaway to Nainital was budget-friendly. Kids loved the lake activities arranged by the team.",
      hi: "नैनीताल weekend getaway budget-friendly था। बच्चों को lake activities बहुत पसंद आईं।",
    },
    tourLabel: "Nainital Weekend",
  },
  {
    id: "demo-19",
    userName: "Isha Gupta",
    rating: 5,
    comment: {
      en: "Safari package in Ranthambore was unforgettable. Saw tigers on day one — guide was excellent!",
      hi: "रणथंभौर safari package अविस्मरणीय था। पहले दिन बाघ देखे — गाइड excellent था!",
    },
    tourLabel: "Ranthambore Safari",
  },
  {
    id: "demo-20",
    userName: "Tarun Shah",
    rating: 5,
    comment: {
      en: "From enquiry to checkout, everything was digital and fast. Invoice and login details came instantly.",
      hi: "enquiry से checkout तक सब digital और fast था। invoice और login details तुरंत मिले।",
    },
    tourLabel: "Digital Booking",
  },
];

export function serviceTypeLabel(serviceType: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    package: "Tour Package",
    vehicle: "Vehicle Rental",
    hotel: "Hotel Stay",
    bus: "Bus Booking",
    flight: "Flight Booking",
    car_rental: "Car Rental",
    tempo_traveller: "Tempo Traveller",
    airport_pickup: "Airport Pickup",
    holiday: "Holiday Package",
  };
  return labels[serviceType] ?? "Travel Booking";
}

export function buildHomeTestimonials(
  reviews: Review[],
  locale: Locale,
  limit = 20
): HomeTestimonial[] {
  const live = reviews.map((review) => ({
    id: review.id,
    userName: review.userName,
    rating: review.rating,
    comment: localizedText(review.comment, locale),
    tourLabel: serviceTypeLabel(review.serviceType),
  }));

  const fallback = FALLBACK_TESTIMONIALS.map((item) => ({
    id: item.id,
    userName: item.userName,
    rating: item.rating,
    comment: localizedText(item.comment, locale),
    tourLabel: item.tourLabel,
  }));

  const seen = new Set<string>();
  const merged: HomeTestimonial[] = [];

  for (const item of [...live, ...fallback]) {
    const key = item.userName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}
