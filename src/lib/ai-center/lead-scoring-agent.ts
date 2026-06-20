import type { LeadScoreRecord } from "@/lib/ai-center/types";

export interface LeadTrackEvent {
  sessionId: string;
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  type:
    | "destination_search"
    | "hotel_view"
    | "vehicle_view"
    | "page_visit"
    | "booking_attempt"
    | "time_on_site";
  destination?: string;
  minutes?: number;
}

export function scoreLead(signals: LeadScoreRecord["signals"]): {
  score: number;
  status: LeadScoreRecord["status"];
  aiSuggestion: string;
} {
  let score = 0;
  score += Math.min(25, signals.destinationSearches * 5);
  score += Math.min(20, signals.hotelViews * 4);
  score += Math.min(15, signals.vehicleViews * 3);
  score += Math.min(15, signals.repeatedVisits * 3);
  score += Math.min(10, Math.floor(signals.timeOnSiteMinutes / 3));
  score += Math.min(15, signals.bookingAttempts * 8);
  score = Math.min(100, score);

  let status: LeadScoreRecord["status"] = "cold";
  let aiSuggestion = "Send nurture email with destination guides.";

  if (score >= 80) {
    status = "hot";
    aiSuggestion = "Contact immediately — offer personalized Manali/Goa package quote.";
  } else if (score >= 50) {
    status = "warm";
    aiSuggestion = "Send reminder with limited-time discount on viewed packages.";
  }

  if (signals.bookingAttempts > 0 && score >= 70) {
    aiSuggestion = "Booking started — call within 30 minutes to close sale.";
  }

  return { score, status, aiSuggestion };
}

export function mergeLeadSignals(
  existing: LeadScoreRecord["signals"],
  event: LeadTrackEvent
): LeadScoreRecord["signals"] {
  const next = { ...existing };
  switch (event.type) {
    case "destination_search":
      next.destinationSearches += 1;
      if (event.destination) next.lastDestination = event.destination;
      break;
    case "hotel_view":
      next.hotelViews += 1;
      break;
    case "vehicle_view":
      next.vehicleViews += 1;
      break;
    case "page_visit":
      next.repeatedVisits += 1;
      break;
    case "booking_attempt":
      next.bookingAttempts += 1;
      break;
    case "time_on_site":
      next.timeOnSiteMinutes += event.minutes ?? 1;
      break;
  }
  return next;
}
