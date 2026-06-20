import { hydratePackagesStore, getPublishedPackages } from "@/lib/package-store";
import { hydrateHotelsStore, getAdminHotels } from "@/lib/hotel-store";
import { hydrateVehiclesStore, getAdminVehicles } from "@/lib/vehicle-store";
import type { TourPackage } from "@/types";

export type VoiceStep =
  | "greeting"
  | "destination"
  | "guests"
  | "budget"
  | "suggest_packages"
  | "modify_package"
  | "booking_details"
  | "payment"
  | "complete";

export interface VoicePackageOption {
  id: string;
  title: string;
  destination: string;
  duration: number;
  price: number;
  highlights: string[];
}

export interface VoiceConversationState {
  step: VoiceStep;
  locale: "en" | "hi";
  destination?: string;
  guests?: number;
  budget?: number;
  selectedPackageId?: string;
  packages?: VoicePackageOption[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  travelDate?: string;
  modifiedPackage?: VoicePackageOption;
}

export interface VoiceResponse {
  reply: string;
  locale: "en" | "hi";
  state: VoiceConversationState;
  quickReplies?: string[];
  packages?: VoicePackageOption[];
  readyForBooking?: boolean;
  readyForPayment?: boolean;
}

function detectLocale(text: string): "en" | "hi" {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  const hindiHints = ["mujhe", "jana", "hai", "kitne", "log", "budget", "kya", "aap", "mera"];
  if (hindiHints.some((w) => text.toLowerCase().includes(w))) return "hi";
  return "en";
}

function t(locale: "en" | "hi", en: string, hi: string): string {
  return locale === "hi" ? hi : en;
}

function extractNumber(text: string): number | null {
  const match = text.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function matchPackages(destination: string, budget: number, guests: number): VoicePackageOption[] {
  const d = destination.toLowerCase();
  const packages = getPublishedPackages().filter((p) =>
    p.cities.some((c) => c.toLowerCase().includes(d) || d.includes(c.toLowerCase()))
  );

  const pool: TourPackage[] =
    packages.length > 0
      ? packages
      : getPublishedPackages().slice(0, 6);

  return pool
    .filter((p) => p.price <= budget * 1.2)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title.en,
      destination: p.cities[0] ?? destination,
      duration: p.duration,
      price: p.price,
      highlights: p.activities.slice(0, 3),
    }));
}

export async function runVoiceConversation(
  message: string,
  state: VoiceConversationState
): Promise<VoiceResponse> {
  await Promise.all([
    hydratePackagesStore(),
    hydrateHotelsStore(),
    hydrateVehiclesStore(),
  ]);

  const trimmed = message.trim();
  const locale =
    state.locale === "en" || state.locale === "hi"
      ? state.step === "greeting"
        ? detectLocale(trimmed) || state.locale
        : state.locale
      : detectLocale(trimmed);

  let next: VoiceConversationState = { ...state, locale };

  if (trimmed === "__init__" || next.step === "greeting") {
    next.step = "destination";
    return {
      reply: t(
        locale,
        "Hello! I'm Safar Sathi Voice Assistant. Where would you like to travel?",
        "नमस्ते! मैं Safar Sathi वॉइस असिस्टेंट हूँ। आप कहाँ जाना चाहते हैं?"
      ),
      locale,
      state: next,
      quickReplies: ["Manali", "Goa", "Kashmir", "Shimla"],
    };
  }

  switch (next.step) {
    case "destination": {
      next.destination = trimmed;
      next.step = "guests";
      return {
        reply: t(locale, "How many travellers?", "Aap kitne log hain?"),
        locale,
        state: next,
        quickReplies: ["2", "4", "6", "8"],
      };
    }
    case "guests": {
      const guests = extractNumber(trimmed) ?? 2;
      next.guests = guests;
      next.step = "budget";
      return {
        reply: t(locale, "What is your budget (in ₹)?", "Aapka budget kya hai?"),
        locale,
        state: next,
        quickReplies: ["15000", "30000", "50000", "75000"],
      };
    }
    case "budget": {
      const budget = extractNumber(trimmed) ?? 30000;
      next.budget = budget;
      const packages = matchPackages(next.destination ?? "Manali", budget, next.guests ?? 2);
      next.packages = packages;
      next.step = "suggest_packages";

      if (packages.length === 0) {
        return {
          reply: t(
            locale,
            `No packages found within ₹${budget.toLocaleString("en-IN")}. Try increasing budget or another destination.`,
            `₹${budget.toLocaleString("en-IN")} में कोई पैकेज नहीं मिला। बजट बढ़ाएँ या दूसरा स्थान चुनें।`
          ),
          locale,
          state: { ...next, step: "destination" },
        };
      }

      const list = packages
        .map((p, i) => `${i + 1}. ${p.title} — ₹${p.price.toLocaleString("en-IN")}`)
        .join("\n");

      return {
        reply: t(
          locale,
          `Here are ${packages.length} best packages for you:\n${list}\nSay package number to select, or ask about hotels, vehicles, weather, or activities.`,
          `Aapke liye ${packages.length} best packages available hain:\n${list}\nPackage number bolen, ya hotel, vehicle, weather, activities poochhen.`
        ),
        locale,
        state: next,
        packages,
        quickReplies: packages.map((_, i) => String(i + 1)),
      };
    }
    case "suggest_packages": {
      const lower = trimmed.toLowerCase();

      if (/hotel|होटल/.test(lower)) {
        const hotels = getAdminHotels()
          .filter((h) =>
            h.city.toLowerCase().includes((next.destination ?? "").toLowerCase())
          )
          .slice(0, 3);
        const list =
          hotels.length > 0
            ? hotels.map((h) => h.name.en).join(", ")
            : t(locale, "Premium hotels available", "Premium hotels uplabdh hain");
        return {
          reply: t(locale, `Hotels: ${list}`, `Hotels: ${list}`),
          locale,
          state: next,
        };
      }

      if (/vehicle|car|taxi|innova|tempo|गाड़ी/.test(lower)) {
        const vehicles = getAdminVehicles()
          .slice(0, 3)
          .map((v) => v.name.en)
          .join(", ");
        return {
          reply: t(locale, `Available vehicles: ${vehicles}`, `Vehicles: ${vehicles}`),
          locale,
          state: next,
        };
      }

      if (/weather|season|मौसम|best time/.test(lower)) {
        return {
          reply: t(
            locale,
            `Best time to visit ${next.destination}: October to March.`,
            `${next.destination} jaane ka best time: October se March.`
          ),
          locale,
          state: next,
        };
      }

      if (/book|booking|payment|pay|razorpay|बुक/.test(lower)) {
        const num = extractNumber(trimmed);
        const idx = num ? num - 1 : 0;
        const selected = next.packages?.[idx] ?? next.packages?.[0];
        if (selected) {
          next.selectedPackageId = selected.id;
          next.modifiedPackage = selected;
          next.step = "booking_details";
          return {
            reply: t(
              locale,
              `Great! Selected: ${selected.title}. Please share your name, email and phone (comma separated).`,
              `Badhiya! Selected: ${selected.title}. Apna naam, email aur phone share karein (comma se).`
            ),
            locale,
            state: next,
            readyForBooking: true,
          };
        }
      }

      const num = extractNumber(trimmed);
      if (num && next.packages && num >= 1 && num <= next.packages.length) {
        const selected = next.packages[num - 1];
        next.selectedPackageId = selected.id;
        next.modifiedPackage = selected;
        return {
          reply: t(
            locale,
            `Selected ${selected.title} at ₹${selected.price.toLocaleString("en-IN")}. Say "book" to proceed or ask to modify hotel/vehicle/activities.`,
            `${selected.title} chuna gaya — ₹${selected.price.toLocaleString("en-IN")}. "Book" bolen ya hotel/vehicle badalne ko kahen.`
          ),
          locale,
          state: next,
          packages: next.packages,
        };
      }

      if (/remove hotel|hotel hatao|change vehicle|activities add/.test(lower)) {
        next.step = "modify_package";
        return {
          reply: t(
            locale,
            "Package updated as requested. Say 'book' when ready.",
            "Package update ho gaya. Ready ho to 'book' bolen."
          ),
          locale,
          state: next,
        };
      }

      return {
        reply: t(
          locale,
          "Choose a package number (1–3), or ask about hotels, vehicles, weather, budget, or say 'book'.",
          "Package number (1–3) chunen, ya hotel, vehicle, weather, budget poochhen, ya 'book' bolen."
        ),
        locale,
        state: next,
        packages: next.packages,
      };
    }
    case "modify_package": {
      next.step = "suggest_packages";
      return {
        reply: t(locale, "Changes saved. Say 'book' to proceed to booking.", "Changes save. 'Book' bolen booking ke liye."),
        locale,
        state: next,
      };
    }
    case "booking_details": {
      const parts = trimmed.split(/[,|]/).map((s) => s.trim());
      next.customerName = parts[0] ?? "Guest";
      next.customerEmail = parts[1] ?? "guest@safarsathi.com";
      next.customerPhone = parts[2] ?? "9999999999";
      next.travelDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      next.step = "payment";
      const pkg = next.modifiedPackage;
      return {
        reply: t(
          locale,
          `Booking ready for ${pkg?.title ?? "package"}. Proceed to Razorpay payment?`,
          `Booking ready hai ${pkg?.title ?? "package"} ke liye. Razorpay payment proceed karein?`
        ),
        locale,
        state: next,
        readyForPayment: true,
      };
    }
    case "payment": {
      if (/yes|ha|haan|proceed|pay|ok|हाँ/.test(trimmed.toLowerCase())) {
        next.step = "complete";
        return {
          reply: t(
            locale,
            "Opening payment. Complete Razorpay checkout to confirm your booking.",
            "Payment khul rahi hai. Razorpay checkout complete karke booking confirm karein."
          ),
          locale,
          state: next,
          readyForPayment: true,
        };
      }
      return {
        reply: t(locale, "Say 'yes' to proceed to payment.", "'Yes' bolen payment ke liye."),
        locale,
        state: next,
      };
    }
    default:
      next.step = "destination";
      return {
        reply: t(locale, "Where would you like to travel?", "Aap kahan jana chahte hain?"),
        locale,
        state: next,
      };
  }
}
