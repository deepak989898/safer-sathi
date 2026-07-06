import type {
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  TripJackTravellerPayload,
} from "@/lib/tripjack/types";

export interface TripJackBookContactInfo {
  ecn?: string;
  emails: string[];
  contacts: string[];
}

export interface TripJackBookRequest {
  bookingId: string;
  paymentInfos: Array<{ amount: number }>;
  travellerInfo: TripJackTravellerPayload[];
  gstInfo: Record<string, unknown>;
  deliveryInfo: {
    emails: string[];
    contacts: string[];
  };
  contactInfo?: TripJackBookContactInfo;
}

function toTravellerPayload(row: FlightPassengerFormRow): TripJackTravellerPayload {
  const payload: TripJackTravellerPayload = {
    ti: row.ti,
    pt: row.pt,
    fN: row.fN.trim().toUpperCase(),
    lN: row.lN.trim().toUpperCase(),
  };

  if (row.dateOfBirth?.trim()) payload.dob = row.dateOfBirth.trim();
  if (row.nationality?.trim()) payload.pNat = row.nationality.trim().toUpperCase();
  if (row.passportNumber?.trim()) payload.pNum = row.passportNumber.trim().toUpperCase();

  if (row.ssrBaggageInfos?.length) payload.ssrBaggageInfos = row.ssrBaggageInfos;
  if (row.ssrMealInfos?.length) payload.ssrMealInfos = row.ssrMealInfos;
  if (row.ssrSeatInfos?.length) payload.ssrSeatInfos = row.ssrSeatInfos;
  if (row.ssrFastForwardInfos?.length) payload.ssrFastForwardInfos = row.ssrFastForwardInfos;

  return payload;
}

export function buildTripJackBookRequest(input: {
  tripjackBookingId: string;
  totalFare: number;
  passengers: FlightPassengerFormRow[];
  delivery: FlightPassengerDeliveryForm;
  travellerInfo?: TripJackTravellerPayload[];
  deliveryInfo?: TripJackBookRequest["deliveryInfo"];
  gstInfo?: Record<string, unknown>;
}): TripJackBookRequest {
  const contact = input.delivery.contact.replace(/\D/g, "").slice(-10);
  const email = input.delivery.email.trim();
  const code = input.delivery.countryCode?.replace(/\D/g, "") || "91";
  const phoneWithCode = contact ? `+${code}${contact}` : contact;

  const deliveryInfo = input.deliveryInfo ?? {
    emails: [email],
    contacts: [phoneWithCode || contact],
  };

  return {
    bookingId: input.tripjackBookingId,
    paymentInfos: [{ amount: input.totalFare }],
    travellerInfo:
      input.travellerInfo?.length
        ? input.travellerInfo
        : input.passengers.map(toTravellerPayload),
    gstInfo: input.gstInfo ?? {},
    deliveryInfo,
    contactInfo: {
      ecn: "EmergencyContactDetails",
      emails: deliveryInfo.emails,
      contacts: deliveryInfo.contacts,
    },
  };
}
