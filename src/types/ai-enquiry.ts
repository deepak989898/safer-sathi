export interface AiAssistantEnquiry {
  id: string;
  createdAt: string;
  dateKey: string;
  timeLabel: string;
  ip?: string;
  ipAddress?: string;
  locationReadable: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  locale: "en" | "hi";
  userId?: string;
  guestId?: string;
  visitorId?: string;
  deviceId?: string;
  userMessage: string;
  aiReply?: string;
  step?: string;
  intent?: string;
  destination?: string;
  pickupCity?: string;
  tripType?: string;
  durationDays?: number;
  selectedTierId?: string;
  packagePrice?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: "active" | "converted" | "abandoned";
}

export interface AiEnquiryChatMessage {
  id: string;
  at: string;
  timeLabel: string;
  role: "user" | "assistant";
  content: string;
}

export interface AiEnquiryVisitorSession {
  id: string;
  visitorKey: string;
  startedAt: string;
  endedAt: string;
  startTimeLabel: string;
  endTimeLabel: string;
  locationReadable: string;
  ip?: string;
  locale: "en" | "hi";
  destination?: string;
  pickupCity?: string;
  tripType?: string;
  durationDays?: number;
  selectedTierId?: string;
  packagePrice?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastStep?: string;
  status: "active" | "converted" | "abandoned";
  messageCount: number;
  chat: AiEnquiryChatMessage[];
}

const SESSION_GAP_MS = 45 * 60 * 1000;

const INTENT_LABELS: Record<string, string> = {
  "__intent:tour_packages": "🏔 Tour Packages",
  "__intent:vehicle_only": "🚘 Vehicles",
  "__intent:hotel_only": "🏨 Hotels",
  "__intent:bus_booking": "🚌 Bus Booking",
  "__intent:international": "✈ International Tour",
  "__intent:custom_tour": "🎒 Custom Tour",
};

const STEP_LABELS: Record<string, string> = {
  welcome: "Started chat",
  destination: "Choosing destination",
  pickup_city: "Pickup city",
  trip_type: "Trip type",
  activities: "Activities",
  guests: "Guest count",
  budget: "Budget",
  duration: "Duration",
  package_tiers: "Package selection",
  package_review: "Package review",
  customize: "Customizing package",
  booking_form: "Booking form",
  payment: "Payment",
  confirmed: "Booking confirmed",
  hotel_destination: "Hotel destination",
  hotel_dates: "Hotel dates",
  hotel_budget: "Hotel budget",
  hotel_results: "Hotel results",
  vehicle_passengers: "Vehicle passengers",
  vehicle_results: "Vehicle results",
};

export function formatChatUserMessage(message: string): string {
  return formatEnquiryUserMessage(message);
}

export function formatEnquiryUserMessage(message: string): string {
  const trimmed = message.trim();
  if (INTENT_LABELS[trimmed]) return INTENT_LABELS[trimmed];
  if (trimmed.startsWith("__intent:")) return trimmed.replace("__intent:", "").replace(/_/g, " ");
  if (trimmed.startsWith("select_tier:")) {
    const tier = trimmed.replace("select_tier:", "");
    return `Selected package: ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
  }
  if (trimmed === "book_package") return "Book Now 📅";
  if (trimmed === "__customize__") return "Customize package";
  if (trimmed === "__human__") return "Talk to human agent";
  if (trimmed === "__pay__") return "Pay Now 💳";
  if (trimmed.startsWith("book_hotel:")) return `Book hotel: ${trimmed.replace("book_hotel:", "")}`;
  if (trimmed.startsWith("book_vehicle:")) return `Book vehicle: ${trimmed.replace("book_vehicle:", "")}`;
  if (trimmed.startsWith("customize_tier:")) return `Customize tier: ${trimmed.replace("customize_tier:", "")}`;
  if (trimmed.startsWith("mod:")) return `Customize: ${trimmed.replace("mod:", "").replace(/_/g, " ")}`;
  return trimmed;
}

export function formatEnquiryStep(step?: string): string {
  if (!step) return "Unknown";
  return STEP_LABELS[step] ?? step.replace(/_/g, " ");
}

function mergeSessionSummary(session: AiEnquiryVisitorSession, enquiry: AiAssistantEnquiry) {
  session.endedAt = enquiry.createdAt;
  session.endTimeLabel = enquiry.timeLabel;
  if (enquiry.destination) session.destination = enquiry.destination;
  if (enquiry.pickupCity) session.pickupCity = enquiry.pickupCity;
  if (enquiry.tripType) session.tripType = enquiry.tripType;
  if (enquiry.durationDays) session.durationDays = enquiry.durationDays;
  if (enquiry.selectedTierId) session.selectedTierId = enquiry.selectedTierId;
  if (enquiry.packagePrice != null && enquiry.packagePrice > 0) {
    session.packagePrice = enquiry.packagePrice;
  }
  if (enquiry.customerName) session.customerName = enquiry.customerName;
  if (enquiry.customerEmail) session.customerEmail = enquiry.customerEmail;
  if (enquiry.customerPhone) session.customerPhone = enquiry.customerPhone;
  if (enquiry.step) session.lastStep = enquiry.step;
  if (enquiry.status === "converted") session.status = "converted";
}

function appendEnquiryToChat(session: AiEnquiryVisitorSession, enquiry: AiAssistantEnquiry) {
  session.chat.push({
    id: `${enquiry.id}-user`,
    at: enquiry.createdAt,
    timeLabel: enquiry.timeLabel,
    role: "user",
    content: formatEnquiryUserMessage(enquiry.userMessage),
  });
  if (enquiry.aiReply?.trim()) {
    session.chat.push({
      id: `${enquiry.id}-ai`,
      at: enquiry.createdAt,
      timeLabel: enquiry.timeLabel,
      role: "assistant",
      content: enquiry.aiReply.trim(),
    });
  }
  mergeSessionSummary(session, enquiry);
  session.messageCount = session.chat.filter((m) => m.role === "user").length;
}

/** Group per-message enquiry logs into visitor chat sessions (new session after 45 min idle). */
export function groupEnquiriesIntoVisitorSessions(
  enquiries: AiAssistantEnquiry[]
): AiEnquiryVisitorSession[] {
  const sorted = [...enquiries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sessions: AiEnquiryVisitorSession[] = [];

  for (const enquiry of sorted) {
    const visitorKey =
      enquiry.visitorId || enquiry.guestId || enquiry.userId || enquiry.ip || enquiry.id;
    const last = sessions[sessions.length - 1];
    const gapMs = last
      ? new Date(enquiry.createdAt).getTime() - new Date(last.endedAt).getTime()
      : Number.POSITIVE_INFINITY;

    if (last && last.visitorKey === visitorKey && gapMs < SESSION_GAP_MS) {
      appendEnquiryToChat(last, enquiry);
      continue;
    }

    const session: AiEnquiryVisitorSession = {
      id: enquiry.id,
      visitorKey,
      startedAt: enquiry.createdAt,
      endedAt: enquiry.createdAt,
      startTimeLabel: enquiry.timeLabel,
      endTimeLabel: enquiry.timeLabel,
      locationReadable: enquiry.locationReadable,
      ip: enquiry.ip,
      locale: enquiry.locale,
      status: enquiry.status,
      messageCount: 0,
      chat: [],
    };
    appendEnquiryToChat(session, enquiry);
    sessions.push(session);
  }

  return sessions.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}

export function groupEnquiriesByDate(
  enquiries: AiAssistantEnquiry[]
): Record<string, AiAssistantEnquiry[]> {
  return enquiries.reduce<Record<string, AiAssistantEnquiry[]>>((acc, item) => {
    const key = item.dateKey;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
