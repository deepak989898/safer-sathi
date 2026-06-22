/** Parse natural language dates and short replies in AI travel chat */

const ACK_PATTERN =
  /^(ok|okay|yes|ha|haan|han|ji|thik|theek|sure|done|thanks|thank you|हाँ|हां|ठीक|जी|धन्यवाद)$/i;

export function isAcknowledgment(text: string): boolean {
  return ACK_PATTERN.test(text.trim());
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(iso: string, locale: "en" | "hi" = "en"): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function addDaysToIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function parseNightsFromText(
  text: string,
  options?: { checkoutPhase?: boolean }
): number | null {
  const raw = text.trim().toLowerCase();
  const labeled = raw.match(/(\d+)\s*(night|nights|din|दिन|रात|raat)/i);
  if (labeled) {
    const n = Number(labeled[1]);
    return n >= 1 && n <= 30 ? n : null;
  }
  if (options?.checkoutPhase && /^\d{1,2}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= 7) return n;
  }
  return null;
}

export function parseFlexibleDate(
  text: string,
  options?: { referenceCheckIn?: string }
): string | null {
  const raw = text.trim();
  if (!raw || isAcknowledgment(raw)) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return validateIso(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
  }

  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    return validateIso(
      `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
    );
  }

  const namedMonth = raw.match(
    /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)?/i
  );
  if (namedMonth) {
    const day = Number(namedMonth[1]);
    if (day < 1 || day > 31) return null;
    const monthMap: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };
    const ref = options?.referenceCheckIn
      ? new Date(`${options.referenceCheckIn}T12:00:00`)
      : new Date();
    let year = ref.getFullYear();
    let month = ref.getMonth();
    if (namedMonth[2]) {
      month = monthMap[namedMonth[2].toLowerCase()] ?? month;
    } else if (options?.referenceCheckIn) {
      const checkIn = new Date(`${options.referenceCheckIn}T12:00:00`);
      month = checkIn.getMonth();
      year = checkIn.getFullYear();
      if (day <= checkIn.getDate()) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
    }
    return validateIso(toIsoDate(new Date(year, month, day)));
  }

  const dayKo = raw.match(/^(\d{1,2})\s*(ko|को|th|tarikh|tareekh|तारीख)?$/i);
  if (dayKo) {
    return parseFlexibleDate(dayKo[1], options);
  }

  return null;
}

function validateIso(iso: string): string | null {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return null;
  return iso;
}

export function isIsoAfter(isoA: string, isoB: string): boolean {
  return new Date(`${isoA}T12:00:00`).getTime() > new Date(`${isoB}T12:00:00`).getTime();
}
