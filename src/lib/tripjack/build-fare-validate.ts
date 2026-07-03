import type {
  FareValidateRequest,
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  TripJackTravellerPayload,
} from "@/lib/tripjack/types";

function attachSsr(row: FlightPassengerFormRow): TripJackTravellerPayload {
  const payload: TripJackTravellerPayload = {
    ti: row.ti,
    pt: row.pt,
    fN: row.fN.trim().toUpperCase(),
    lN: row.lN.trim().toUpperCase(),
  };

  if (row.ssrBaggageInfos?.length) payload.ssrBaggageInfos = row.ssrBaggageInfos;
  if (row.ssrMealInfos?.length) payload.ssrMealInfos = row.ssrMealInfos;
  if (row.ssrSeatInfos?.length) payload.ssrSeatInfos = row.ssrSeatInfos;
  if (row.ssrFastForwardInfos?.length) payload.ssrFastForwardInfos = row.ssrFastForwardInfos;

  return payload;
}

export function buildFareValidateRequest(input: {
  bookingId: string;
  passengers: FlightPassengerFormRow[];
  delivery: FlightPassengerDeliveryForm;
}): FareValidateRequest {
  const email = input.delivery.email.trim();
  const contact = input.delivery.contact.replace(/\D/g, "").slice(-10);
  const code = input.delivery.countryCode.replace(/\D/g, "") || "91";

  return {
    bookingId: input.bookingId,
    travellerInfo: input.passengers.map(attachSsr),
    deliveryInfo: {
      emails: [email],
      contacts: [contact],
      code: [code],
    },
  };
}

export function buildEmptyPassengerRows(counts: {
  adults: number;
  children: number;
  infants: number;
}): FlightPassengerFormRow[] {
  const rows: FlightPassengerFormRow[] = [];

  for (let i = 0; i < counts.adults; i += 1) {
    rows.push({
      ti: "Mr",
      pt: "ADULT",
      fN: "",
      lN: "",
      gender: "",
      dateOfBirth: "",
      nationality: "IN",
      passportNumber: "",
    });
  }
  for (let i = 0; i < counts.children; i += 1) {
    rows.push({
      ti: "Mstr",
      pt: "CHILD",
      fN: "",
      lN: "",
      gender: "",
      dateOfBirth: "",
      nationality: "IN",
      passportNumber: "",
    });
  }
  for (let i = 0; i < counts.infants; i += 1) {
    rows.push({
      ti: "Mstr",
      pt: "INFANT",
      fN: "",
      lN: "",
      gender: "",
      dateOfBirth: "",
      nationality: "IN",
      passportNumber: "",
    });
  }

  return rows;
}
