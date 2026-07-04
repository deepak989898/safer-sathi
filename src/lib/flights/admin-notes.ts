import type { FlightAdminNote, FlightBookingRecord } from "@/lib/flights/types";

export function getAdminNotesHistory(booking: FlightBookingRecord): FlightAdminNote[] {
  if (Array.isArray(booking.adminNotesHistory)) return booking.adminNotesHistory;
  if (Array.isArray(booking.adminNotes)) return booking.adminNotes as FlightAdminNote[];
  if (typeof booking.adminNotes === "string" && booking.adminNotes.trim()) {
    return [
      {
        note: booking.adminNotes,
        adminId: "system",
        adminName: "System",
        createdAt: booking.updatedAt || booking.createdAt,
      },
    ];
  }
  return [];
}
