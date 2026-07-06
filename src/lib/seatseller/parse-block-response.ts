import { SeatSellerApiError } from "@/lib/seatseller/api-error";
import type { SeatSellerBlockTicketResponse } from "@/lib/seatseller/types";
import { asRecord, pickString } from "@/lib/seatseller/normalize";
import { extractSeatSellerErrorMessage } from "@/lib/seatseller/errors";

export function parseSeatSellerBlockTicketResponse(
  raw: unknown,
  statusCode = 200
): SeatSellerBlockTicketResponse {
  const record = asRecord(raw);
  if (!record) {
    throw new SeatSellerApiError("Empty response from SeatSeller blockTicket API", statusCode, raw);
  }

  const blockKey = pickString(record, ["blockKey", "BlockKey", "blockkey"], "");
  if (blockKey) {
    return {
      blockKey,
      expiresIn: Number(record.expiresIn ?? record.expiresInSeconds ?? 480) || 480,
      fare: Number(record.fare ?? record.totalFare ?? 0) || undefined,
      ...record,
    };
  }

  const message = extractSeatSellerErrorMessage(raw, statusCode);
  throw new SeatSellerApiError(message, statusCode, raw);
}
