export interface PhoneCountryCode {
  code: string;
  dialCode: string;
  name: string;
}

/** Common dial codes for flight booking — India first (default). */
export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { code: "IN", dialCode: "91", name: "India" },
  { code: "US", dialCode: "1", name: "United States" },
  { code: "GB", dialCode: "44", name: "United Kingdom" },
  { code: "AE", dialCode: "971", name: "United Arab Emirates" },
  { code: "SA", dialCode: "966", name: "Saudi Arabia" },
  { code: "QA", dialCode: "974", name: "Qatar" },
  { code: "OM", dialCode: "968", name: "Oman" },
  { code: "KW", dialCode: "965", name: "Kuwait" },
  { code: "BH", dialCode: "973", name: "Bahrain" },
  { code: "SG", dialCode: "65", name: "Singapore" },
  { code: "MY", dialCode: "60", name: "Malaysia" },
  { code: "TH", dialCode: "66", name: "Thailand" },
  { code: "ID", dialCode: "62", name: "Indonesia" },
  { code: "PH", dialCode: "63", name: "Philippines" },
  { code: "VN", dialCode: "84", name: "Vietnam" },
  { code: "CN", dialCode: "86", name: "China" },
  { code: "HK", dialCode: "852", name: "Hong Kong" },
  { code: "JP", dialCode: "81", name: "Japan" },
  { code: "KR", dialCode: "82", name: "South Korea" },
  { code: "AU", dialCode: "61", name: "Australia" },
  { code: "NZ", dialCode: "64", name: "New Zealand" },
  { code: "CA", dialCode: "1", name: "Canada" },
  { code: "DE", dialCode: "49", name: "Germany" },
  { code: "FR", dialCode: "33", name: "France" },
  { code: "IT", dialCode: "39", name: "Italy" },
  { code: "ES", dialCode: "34", name: "Spain" },
  { code: "NL", dialCode: "31", name: "Netherlands" },
  { code: "CH", dialCode: "41", name: "Switzerland" },
  { code: "SE", dialCode: "46", name: "Sweden" },
  { code: "NO", dialCode: "47", name: "Norway" },
  { code: "DK", dialCode: "45", name: "Denmark" },
  { code: "BE", dialCode: "32", name: "Belgium" },
  { code: "AT", dialCode: "43", name: "Austria" },
  { code: "IE", dialCode: "353", name: "Ireland" },
  { code: "PT", dialCode: "351", name: "Portugal" },
  { code: "PL", dialCode: "48", name: "Poland" },
  { code: "RU", dialCode: "7", name: "Russia" },
  { code: "TR", dialCode: "90", name: "Turkey" },
  { code: "EG", dialCode: "20", name: "Egypt" },
  { code: "ZA", dialCode: "27", name: "South Africa" },
  { code: "KE", dialCode: "254", name: "Kenya" },
  { code: "NG", dialCode: "234", name: "Nigeria" },
  { code: "PK", dialCode: "92", name: "Pakistan" },
  { code: "BD", dialCode: "880", name: "Bangladesh" },
  { code: "LK", dialCode: "94", name: "Sri Lanka" },
  { code: "NP", dialCode: "977", name: "Nepal" },
  { code: "BT", dialCode: "975", name: "Bhutan" },
  { code: "MV", dialCode: "960", name: "Maldives" },
  { code: "MM", dialCode: "95", name: "Myanmar" },
  { code: "KH", dialCode: "855", name: "Cambodia" },
  { code: "LA", dialCode: "856", name: "Laos" },
];

export const DEFAULT_PHONE_COUNTRY_CODE = "91";

export function findPhoneCountryByDialCode(dialCode: string): PhoneCountryCode | undefined {
  const normalized = dialCode.replace(/\D/g, "");
  return PHONE_COUNTRY_CODES.find((c) => c.dialCode === normalized);
}

export function searchPhoneCountries(query: string, limit = 12): PhoneCountryCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return PHONE_COUNTRY_CODES.slice(0, limit);

  const digits = q.replace(/\D/g, "");
  return PHONE_COUNTRY_CODES.filter((country) => {
    if (digits && country.dialCode.startsWith(digits)) return true;
    if (country.name.toLowerCase().includes(q)) return true;
    if (country.code.toLowerCase().includes(q)) return true;
    if (`+${country.dialCode}`.includes(q)) return true;
    return false;
  }).slice(0, limit);
}

export function formatPhoneCountryLabel(country: PhoneCountryCode): string {
  return `+${country.dialCode} ${country.name}`;
}

/** YYYY-MM-DD — latest allowed DOB (today; no future dates). */
export function maxDateOfBirthValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isFutureDateOfBirth(value: string): boolean {
  if (!value) return false;
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dob > today;
}
