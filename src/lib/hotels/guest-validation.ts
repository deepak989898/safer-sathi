import type {
  HotelGuestDetailsForm,
  HotelPrimaryGuestForm,
  HotelRoomGuestForm,
} from "@/lib/hotels/types";

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const INDIAN_PIN_REGEX = /^\d{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuestFieldErrors = Record<string, string>;

export function guestNameOnly(value: string, max = 50): string {
  return value.replace(/[^a-zA-Z\s.'-]/g, "").replace(/\s+/g, " ").slice(0, max);
}

export function guestDigitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export function guestPanInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

/** Normalize Indian mobile: strip country code and leading 0. */
export function normalizeIndianMobile(input: string): string {
  let digits = input.replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  while (digits.startsWith("0") && digits.length > 0) {
    digits = digits.slice(1);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits.slice(0, 10);
}

export function validateIndianMobile(mobile: string): string | null {
  const normalized = normalizeIndianMobile(mobile);
  if (!normalized) return "Mobile number is required";
  if (normalized.length !== 10) return "Enter a valid 10-digit mobile number";
  if (!INDIAN_MOBILE_REGEX.test(normalized)) {
    return "Mobile must start with 6, 7, 8, or 9 (no leading 0)";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return null;
}

export function validatePan(pan: string, required = true): string | null {
  const normalized = pan.trim().toUpperCase();
  if (!normalized) return required ? "PAN is required" : null;
  if (normalized.length !== 10) return "PAN must be exactly 10 characters";
  if (!PAN_REGEX.test(normalized)) {
    return "Invalid PAN format (e.g. ABCDE1234F)";
  }
  return null;
}

export function validateIndianPin(zipCode: string): string | null {
  const digits = zipCode.replace(/\D/g, "");
  if (!digits) return "PIN code is required";
  if (!INDIAN_PIN_REGEX.test(digits)) return "PIN code must be 6 digits";
  return null;
}

export function validateGuestName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return `${label} can only contain letters`;
  return null;
}

export function validatePassportNumber(value: string, required: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Passport number is required" : null;
  if (trimmed.length < 6) return "Enter a valid passport number";
  return null;
}

export function validatePassportExpiry(value: string, required: boolean): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Passport expiry is required" : null;
  const expiry = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(expiry.getTime())) return "Enter a valid expiry date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return "Passport must not be expired";
  return null;
}

export function validateChildAge(age: number | undefined): string | null {
  if (age == null || Number.isNaN(age)) return "Child age is required";
  if (age < 1 || age > 17) return "Child age must be between 1 and 17";
  return null;
}

export function validatePrimaryGuestField(
  field: keyof HotelPrimaryGuestForm,
  value: string,
  options: { panRequired?: boolean; passportRequired?: boolean }
): string | null {
  switch (field) {
    case "firstName":
      return validateGuestName(value, "First name");
    case "lastName":
      return validateGuestName(value, "Last name");
    case "email":
      return validateEmail(value);
    case "mobile":
      return validateIndianMobile(value);
    case "address":
      return value.trim() ? null : "Address is required";
    case "city":
      return value.trim() ? null : "City is required";
    case "state":
      return value.trim() ? null : "State is required";
    case "country":
      return value.trim() ? null : "Country is required";
    case "zipCode":
      return validateIndianPin(value);
    case "pan":
      return validatePan(value, Boolean(options.panRequired));
    case "passportNumber":
      return validatePassportNumber(value, Boolean(options.passportRequired));
    case "passportExpiry":
      return validatePassportExpiry(value, Boolean(options.passportRequired));
    default:
      return null;
  }
}

export function validateGuestDetailsForm(
  guestDetails: HotelGuestDetailsForm,
  options: { panRequired: boolean; passportRequired: boolean }
): GuestFieldErrors {
  const errors: GuestFieldErrors = {};
  const pg = guestDetails.primaryGuest;

  for (const field of [
    "firstName",
    "lastName",
    "email",
    "mobile",
    "address",
    "city",
    "state",
    "country",
    "zipCode",
    "pan",
    "passportNumber",
    "passportExpiry",
  ] as const) {
    const message = validatePrimaryGuestField(field, String(pg[field] ?? ""), options);
    if (message) errors[`primary.${field}`] = message;
  }

  guestDetails.roomGuests.forEach((room, roomIndex) => {
    room.forEach((guest, guestIndex) => {
      const prefix = `room.${roomIndex}.${guestIndex}`;
      const firstNameError = validateGuestName(guest.firstName, "First name");
      const lastNameError = validateGuestName(guest.lastName, "Last name");
      if (firstNameError) errors[`${prefix}.firstName`] = firstNameError;
      if (lastNameError) errors[`${prefix}.lastName`] = lastNameError;
      if (guest.type === "CHILD") {
        const ageError = validateChildAge(guest.age);
        if (ageError) errors[`${prefix}.age`] = ageError;
      }
    });
  });

  return errors;
}

export function normalizePrimaryGuest(
  guest: HotelPrimaryGuestForm,
  options: { panRequired?: boolean; passportRequired?: boolean }
): HotelPrimaryGuestForm {
  const normalized: HotelPrimaryGuestForm = {
    ...guest,
    firstName: guestNameOnly(guest.firstName),
    lastName: guestNameOnly(guest.lastName),
    email: guest.email.trim().toLowerCase(),
    mobile: normalizeIndianMobile(guest.mobile),
    countryCode: guest.countryCode?.replace(/\D/g, "") || "91",
    address: guest.address.trim(),
    city: guestNameOnly(guest.city, 80),
    state: guestNameOnly(guest.state, 80),
    country: guest.country.trim(),
    zipCode: guestDigitsOnly(guest.zipCode, 6),
  };

  if (options.panRequired || guest.pan?.trim()) {
    normalized.pan = guestPanInput(guest.pan ?? "");
  } else {
    delete normalized.pan;
  }

  if (options.passportRequired || guest.passportNumber?.trim()) {
    normalized.passportNumber = guest.passportNumber?.trim().toUpperCase();
    normalized.passportExpiry = guest.passportExpiry?.trim();
  } else {
    delete normalized.passportNumber;
    delete normalized.passportExpiry;
    delete normalized.passportNationality;
    delete normalized.passportIssueCountry;
  }

  return normalized;
}

export function normalizeRoomGuest(guest: HotelRoomGuestForm): HotelRoomGuestForm {
  const normalized: HotelRoomGuestForm = {
    ...guest,
    firstName: guestNameOnly(guest.firstName),
    lastName: guestNameOnly(guest.lastName),
  };
  if (guest.type === "CHILD" && guest.age != null) {
    normalized.age = Math.min(17, Math.max(1, Math.round(guest.age)));
  } else {
    delete normalized.age;
  }
  return normalized;
}

export function normalizeGuestDetailsForm(
  guestDetails: HotelGuestDetailsForm,
  options: { panRequired: boolean; passportRequired: boolean }
): HotelGuestDetailsForm {
  return {
    ...guestDetails,
    primaryGuest: normalizePrimaryGuest(guestDetails.primaryGuest, options),
    roomGuests: guestDetails.roomGuests.map((room) =>
      room.map((guest) => normalizeRoomGuest(guest))
    ),
    specialRequests: guestDetails.specialRequests?.trim() || undefined,
    gstNumber: guestDetails.gstNumber?.trim() || undefined,
    gstCompanyName: guestDetails.gstCompanyName?.trim() || undefined,
  };
}

export function firstGuestValidationError(errors: GuestFieldErrors): string | null {
  const keys = Object.keys(errors);
  return keys.length ? errors[keys[0]] : null;
}
