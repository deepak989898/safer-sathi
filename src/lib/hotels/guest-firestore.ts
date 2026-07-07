import type {
  HotelGuestDetailsForm,
  HotelPrimaryGuestForm,
  HotelRoomGuestForm,
} from "@/lib/hotels/types";
import { normalizeGuestDetailsForm } from "@/lib/hotels/guest-validation";

/** Firestore cannot store array-of-arrays; use roomGuestRooms instead. */
export type StoredHotelGuestDetails = Omit<HotelGuestDetailsForm, "roomGuests"> & {
  roomGuestRooms?: Array<{ roomIndex: number; guests: HotelRoomGuestForm[] }>;
  roomGuests?: HotelRoomGuestForm[][];
};

function cleanPrimaryGuest(guest: HotelPrimaryGuestForm): HotelPrimaryGuestForm {
  const copy = { ...guest };
  if (!copy.pan?.trim()) delete copy.pan;
  if (!copy.passportNumber?.trim()) {
    delete copy.passportNumber;
    delete copy.passportExpiry;
    delete copy.passportNationality;
    delete copy.passportIssueCountry;
  }
  return copy;
}

function cleanRoomGuest(guest: HotelRoomGuestForm): HotelRoomGuestForm {
  const copy = { ...guest };
  if (copy.type !== "CHILD") delete copy.age;
  return copy;
}

export function serializeGuestDetailsForFirestore(
  guestDetails: HotelGuestDetailsForm,
  options: { panRequired: boolean; passportRequired: boolean }
): StoredHotelGuestDetails {
  const normalized = normalizeGuestDetailsForm(guestDetails, options);
  const { roomGuests, ...rest } = normalized;

  return {
    ...rest,
    primaryGuest: cleanPrimaryGuest(normalized.primaryGuest),
    roomGuestRooms: roomGuests.map((guests, roomIndex) => ({
      roomIndex,
      guests: guests.map(cleanRoomGuest),
    })),
  };
}

export function normalizeStoredGuestDetails(
  stored: StoredHotelGuestDetails | HotelGuestDetailsForm
): HotelGuestDetailsForm {
  const withRooms = stored as StoredHotelGuestDetails;
  if (Array.isArray(withRooms.roomGuestRooms) && withRooms.roomGuestRooms.length > 0) {
    const { roomGuestRooms, roomGuests: _legacy, ...rest } = withRooms;
    return {
      ...rest,
      roomGuests: [...roomGuestRooms]
        .sort((a, b) => a.roomIndex - b.roomIndex)
        .map((room) => room.guests.map(cleanRoomGuest)),
    };
  }

  if (Array.isArray(stored.roomGuests)) {
    return {
      ...stored,
      roomGuests: stored.roomGuests.map((room) => room.map(cleanRoomGuest)),
      primaryGuest: cleanPrimaryGuest(stored.primaryGuest),
    };
  }

  return stored as HotelGuestDetailsForm;
}
