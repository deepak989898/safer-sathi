import type { Locale } from "@/types";

export const locales: Locale[] = ["en", "hi"];
export const defaultLocale: Locale = "en";

export const translations = {
  en: {
    nav: {
      home: "Home",
      about: "About Us",
      packages: "Tour Packages",
      vehicles: "Vehicles",
      hotels: "Hotels",
      bus: "Bus Booking",
      carRental: "Car Rental",
      tempo: "Tempo Traveller",
      airport: "Airport Pickup",
      holiday: "Holiday Packages",
      blog: "Blog",
      gallery: "Gallery",
      reviews: "Reviews",
      faq: "FAQ",
      contact: "Contact Us",
      aiAssistant: "AI Assistant",
      login: "Login",
      register: "Register",
      myBookings: "My Bookings",
    },
    hero: {
      title: "AI Powered Travel Experiences",
      subtitle:
        "Discover incredible destinations with intelligent recommendations, instant booking, and 24/7 AI support.",
      search: "Search",
      whereTo: "Where to?",
      checkIn: "Check-in",
      checkOut: "Check-out",
      guests: "Guests",
    },
    features: {
      aiAssistant: "AI Travel Assistant",
      aiAssistantDesc: "Plan trips with intelligent AI recommendations",
      bestPrice: "Best Price Guarantee",
      bestPriceDesc: "Competitive pricing with no hidden charges",
      support: "24/7 Support",
      supportDesc: "Round-the-clock customer assistance",
      secure: "Secure Booking",
      secureDesc: "Safe payments with instant confirmation",
    },
    common: {
      viewDetails: "View Details",
      bookNow: "Book Now",
      from: "From",
      perDay: "per day",
      perNight: "per night",
      perKm: "per km",
      filters: "Filters",
      priceRange: "Price Range",
      clearFilters: "Clear Filters",
      noResults: "No results found",
      loading: "Loading...",
      confirmed: "Confirmed",
      upcoming: "Upcoming",
      completed: "Completed",
      cancelled: "Cancelled",
      pending: "Pending",
    },
    footer: {
      tagline: "Your trusted AI-powered travel companion across India.",
      quickLinks: "Quick Links",
      services: "Services",
      contact: "Contact",
      rights: "All rights reserved.",
    },
  },
  hi: {
    nav: {
      home: "होम",
      about: "हमारे बारे में",
      packages: "टूर पैकेज",
      vehicles: "वाहन",
      hotels: "होटल",
      bus: "बस बुकिंग",
      carRental: "कार किराया",
      tempo: "टेम्पो ट्रैवलर",
      airport: "एयरपोर्ट पिकअप",
      holiday: "हॉलिडे पैकेज",
      blog: "ब्लॉग",
      gallery: "गैलरी",
      reviews: "समीक्षाएं",
      faq: "FAQ",
      contact: "संपर्क करें",
      aiAssistant: "AI सहायक",
      login: "लॉगिन",
      register: "रजिस्टर",
      myBookings: "मेरी बुकings",
    },
    hero: {
      title: "AI संचालित यात्रा अनुभव",
      subtitle:
        "बुद्धिमान सिफारिशों, तत्काल बुकिंग और 24/7 AI सहायता के साथ अद्भुत गंतव्य खोजें।",
      search: "खोजें",
      whereTo: "कहाँ जाना है?",
      checkIn: "चेक-इन",
      checkOut: "चेक-आउट",
      guests: "मेहमान",
    },
    features: {
      aiAssistant: "AI यात्रा सहायक",
      aiAssistantDesc: "बुद्धिमान AI सिफारिशों के साथ यात्रा की योजना बनाएं",
      bestPrice: "सर्वोत्तम मूल्य गारंटी",
      bestPriceDesc: "कोई छिपा शुल्क नहीं, प्रतिस्पर्धी मूल्य",
      support: "24/7 सहायता",
      supportDesc: "चौबीसों घंटे ग्राहक सहायता",
      secure: "सुरक्षित बुकिंग",
      secureDesc: "तत्काल पुष्टि के साथ सुरक्षित भुगतान",
    },
    common: {
      viewDetails: "विवरण देखें",
      bookNow: "अभी बुक करें",
      from: "से",
      perDay: "प्रति दिन",
      perNight: "प्रति रात",
      perKm: "प्रति किमी",
      filters: "फ़िल्टर",
      priceRange: "मूल्य सीमा",
      clearFilters: "फ़िल्टर साफ़ करें",
      noResults: "कोई परिणाम नहीं मिला",
      loading: "लोड हो रहा है...",
      confirmed: "पुष्टि",
      upcoming: "आगामी",
      completed: "पूर्ण",
      cancelled: "रद्द",
      pending: "लंबित",
    },
    footer: {
      tagline: "भारत भर में आपका विश्वसनीय AI-संचालित यात्रा साथी।",
      quickLinks: "त्वरित लिंक",
      services: "सेवाएं",
      contact: "संपर्क",
      rights: "सर्वाधिकार सुरक्षित।",
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(
  locale: Locale,
  section: keyof typeof translations.en,
  key: string
): string {
  const sectionData = translations[locale][section] as Record<string, string>;
  return sectionData[key] ?? key;
}

export function localizedText(
  obj: { en: string; hi: string },
  locale: Locale
): string {
  return obj[locale] ?? obj.en;
}

export function formatCurrency(amount: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
