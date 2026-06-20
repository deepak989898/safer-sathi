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
