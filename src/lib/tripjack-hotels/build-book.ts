import type { HotelGuestDetailsForm } from "@/lib/hotels/types";
import type { HotelRoomRequest } from "@/lib/tripjack-hotels/types";

export interface TripJackHotelBookRequest {
  bookingId: string;
  deliveryInfo: {
    emails: string[];
    contacts: string[];
  };
  roomTravellerInfo: Array<{
    travellerInfo: Array<{
      ti: string;
      fN: string;
      lN: string;
      pt: "ADULT" | "CHILD";
      dob?: string;
    }>;
  }>;
  paymentInfos: Array<{ amount: number }>;
  gstInfo: Record<string, unknown>;
  pan?: string;
  passportInfo?: {
    pNum: string;
    eD?: string;
    pNat?: string;
    pid?: string;
  };
  specialRequest?: string;
}

function titleToTi(title: string): string {
  const map: Record<string, string> = {
    Mr: "Mr",
    Ms: "Ms",
    Mrs: "Mrs",
    Mstr: "Mstr",
    Miss: "Miss",
  };
  return map[title] ?? "Mr";
}

function childDobFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - Math.max(0, age));
  return d.toISOString().slice(0, 10);
}

export function buildTripJackHotelBookRequest(input: {
  tripjackBookingId: string;
  totalFare: number;
  guestDetails: HotelGuestDetailsForm;
  rooms: HotelRoomRequest[];
}): TripJackHotelBookRequest {
  const pg = input.guestDetails.primaryGuest;
  const contact = pg.mobile.replace(/\D/g, "").slice(-10);

  const roomTravellerInfo = input.rooms.map((room, roomIndex) => {
    const guests = input.guestDetails.roomGuests[roomIndex] ?? [];
    const travellerInfo = guests.map((guest) => {
      const entry: TripJackHotelBookRequest["roomTravellerInfo"][number]["travellerInfo"][number] = {
        ti: titleToTi(guest.title),
        fN: guest.firstName.trim().toUpperCase(),
        lN: guest.lastName.trim().toUpperCase(),
        pt: guest.type,
      };
      if (guest.type === "CHILD" && guest.age != null) {
        entry.dob = childDobFromAge(guest.age);
      }
      return entry;
    });

    while (travellerInfo.length < (room.adults ?? 1)) {
      travellerInfo.push({
        ti: titleToTi(pg.firstName ? "Mr" : "Mr"),
        fN: pg.firstName.trim().toUpperCase() || "GUEST",
        lN: pg.lastName.trim().toUpperCase() || "NAME",
        pt: "ADULT",
      });
    }

    return { travellerInfo };
  });

  const body: TripJackHotelBookRequest = {
    bookingId: input.tripjackBookingId,
    deliveryInfo: {
      emails: [pg.email.trim()],
      contacts: [contact],
    },
    roomTravellerInfo,
    paymentInfos: [{ amount: input.totalFare }],
    gstInfo:
      input.guestDetails.gstNumber
        ? {
            gstNumber: input.guestDetails.gstNumber,
            registeredName: input.guestDetails.gstCompanyName ?? "",
          }
        : {},
  };

  if (pg.pan?.trim()) {
    body.pan = pg.pan.trim().toUpperCase();
  }

  if (pg.passportNumber?.trim()) {
    body.passportInfo = {
      pNum: pg.passportNumber.trim(),
      eD: pg.passportExpiry,
      pNat: pg.passportNationality,
      pid: pg.passportIssueCountry,
    };
  }

  if (input.guestDetails.specialRequests?.trim()) {
    body.specialRequest = input.guestDetails.specialRequests.trim();
  }

  return body;
}
