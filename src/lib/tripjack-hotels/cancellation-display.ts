import type { CancellationPenalty } from "@/lib/tripjack-hotels/types";

const KOLKATA_TZ = "Asia/Kolkata";

/** Parse TripJack date/time strings (often without timezone) as IST. */
export function parseTripJackCancellationDate(value?: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = trimmed.includes("T") ? `${trimmed}+05:30` : `${trimmed}T00:00:00+05:30`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCancellationDateTime(value?: string, locale = "en-IN"): string {
  const parsed = parseTripJackCancellationDate(value);
  if (!parsed) return value?.trim() || "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: KOLKATA_TZ,
  }).format(parsed);
}

export function formatCancellationDateRange(from?: string, to?: string, locale = "en-IN"): string {
  const fromLabel = from ? formatCancellationDateTime(from, locale) : "";
  const toLabel = to ? formatCancellationDateTime(to, locale) : "";

  if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
  return fromLabel || toLabel || "—";
}

export interface CancellationRuleLine {
  key: string;
  tone: "free" | "charge" | "info";
  text: string;
}

export function buildCancellationRuleLines(input: {
  isRefundable: boolean;
  freeCancellationUntil?: string;
  penalties?: CancellationPenalty[];
  locale?: string;
}): CancellationRuleLine[] {
  const locale = input.locale ?? "en-IN";
  const penalties = input.penalties ?? [];
  const freePenalty = penalties.find((penalty) => penalty.amount === 0);
  const chargePenalties = penalties.filter((penalty) => penalty.amount > 0);
  const freeUntil =
    input.freeCancellationUntil?.trim() ||
    freePenalty?.to ||
    freePenalty?.from ||
    "";

  const lines: CancellationRuleLine[] = [];

  if (input.isRefundable && freeUntil) {
    lines.push({
      key: "free-until",
      tone: "free",
      text: `Free cancellation until ${formatCancellationDateTime(freeUntil, locale)}`,
    });
  }

  for (const penalty of chargePenalties) {
    const range = formatCancellationDateRange(penalty.from, penalty.to, locale);
    const amount = penalty.amount.toLocaleString(locale, { maximumFractionDigits: 0 });
    const currency = penalty.currency || "INR";
    lines.push({
      key: `${penalty.from}-${penalty.to}-${penalty.amount}`,
      tone: "charge",
      text:
        range !== "—"
          ? `From ${range}: ${currency} ${amount} cancellation charge`
          : `${currency} ${amount} cancellation charge`,
    });
  }

  if (!lines.length) {
    if (!input.isRefundable) {
      lines.push({
        key: "non-refundable",
        tone: "info",
        text: "Non-refundable rate",
      });
    } else {
      lines.push({
        key: "refundable-generic",
        tone: "info",
        text: "Refundable rate — see final policy at booking",
      });
    }
  }

  return lines;
}
