import type { FlightBookingRecord } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function customerStatusLabel(status: FlightBookingRecord["status"]): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "manual_review_required") return "Pending confirmation";
  if (status === "booking_pending") return "Processing";
  if (status === "booking_failed") return "Booking failed";
  if (status === "payment_failed") return "Payment failed";
  return status.replace(/_/g, " ");
}

const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #0f172a;
    background: #fff;
    font-size: 13px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket {
    max-width: 720px;
    margin: 0 auto;
    border: 1px solid #dbeafe;
    border-radius: 16px;
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #1a4fa3 0%, #2563c9 100%);
    color: #fff;
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .brand { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9; }
  .title { margin: 4px 0 0; font-size: 22px; font-weight: 700; }
  .badge {
    background: #fff;
    color: #1a4fa3;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .badge.pending { background: #fef3c7; color: #92400e; }
  .badge.confirmed { background: #d1fae5; color: #065f46; }
  .body { padding: 20px 24px 24px; }
  .notice {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 20px;
    margin-bottom: 18px;
  }
  .meta dt { color: #64748b; font-size: 11px; margin: 0 0 2px; }
  .meta dd { margin: 0; font-weight: 600; }
  .meta .mono { font-family: ui-monospace, monospace; }
  .meta .pnr { font-size: 18px; color: #1a4fa3; }
  .route {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 18px;
  }
  .route-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .airline-code {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #eff6ff;
    color: #1a4fa3;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
  }
  .route-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
    text-align: center;
  }
  .route-grid .time { font-size: 22px; font-weight: 700; }
  .route-grid .code { font-size: 16px; font-weight: 700; color: #1a4fa3; }
  .route-grid .city { font-size: 12px; color: #64748b; }
  .route-grid .mid { font-size: 12px; color: #64748b; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    text-align: left;
  }
  th { background: #f8fafc; color: #64748b; font-weight: 600; }
  .fare-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background: #eff6ff;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 16px;
  }
  .fare-box dt { color: #64748b; font-size: 11px; margin: 0 0 2px; }
  .fare-box dd { margin: 0; font-weight: 700; }
  .fare-box .amount { font-size: 18px; color: #1a4fa3; }
  .footer {
    border-top: 1px dashed #cbd5e1;
    padding-top: 12px;
    font-size: 12px;
    color: #64748b;
  }
  .segments { margin-bottom: 14px; font-size: 12px; }
  .segment {
    padding: 8px 10px;
    background: #f8fafc;
    border-radius: 8px;
    margin-top: 6px;
  }
`;

export function buildFlightTicketPrintHtml(
  booking: FlightBookingRecord,
  locale: Locale
): string {
  const details = booking.bookingDetailNormalized ?? booking.normalizedBookingDetails;
  const segments =
    details?.flightSegments?.length
      ? details.flightSegments
      : booking.fareValidateNormalized?.segments ?? booking.reviewNormalized?.segments ?? [];

  const pnr = booking.pnr || details?.pnr || "";
  const airlinePnr = booking.airlinePnr || details?.airlinePnr || "";
  const ticketNumber = booking.ticketNumber || details?.ticketNumber || "";
  const statusLabel = customerStatusLabel(booking.status);
  const badgeClass =
    booking.status === "confirmed"
      ? "confirmed"
      : booking.status === "manual_review_required" || booking.status === "booking_pending"
        ? "pending"
        : "";

  const passengers =
    details?.passengers?.length
      ? details.passengers
      : booking.passengers.map((p) => ({
          name: `${p.ti} ${p.fN} ${p.lN}`,
          type: p.pt,
          ticketNumber: ticketNumber || undefined,
          pnr: pnr || undefined,
          status: undefined,
        }));

  const passengerRows = passengers
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.type)}</td>
        <td class="mono">${escapeHtml(p.ticketNumber || p.pnr || ticketNumber || "Pending")}</td>
        <td>${escapeHtml(
          p.status || (booking.status === "confirmed" ? "Confirmed" : statusLabel)
        )}</td>
      </tr>`
    )
    .join("");

  const segmentHtml =
    segments.length > 0
      ? `<div class="segments">
          <strong>Flight segments</strong>
          ${segments
            .map(
              (seg) => `<div class="segment">
                <strong>${escapeHtml(seg.airlineCode)} ${escapeHtml(seg.flightNumber)}</strong>
                · ${escapeHtml(seg.departureAirportCode)} → ${escapeHtml(seg.arrivalAirportCode)}
                <br>${escapeHtml(seg.departureTime)} – ${escapeHtml(seg.arrivalTime)}
              </div>`
            )
            .join("")}
        </div>`
      : "";

  const pendingNotice =
    booking.paymentStatus === "paid" &&
    (booking.status === "manual_review_required" || booking.status === "booking_pending")
      ? `<div class="notice">Payment received. Your e-ticket is being confirmed — PNR will appear here once issued.</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Flight Ticket ${escapeHtml(booking.bookingId)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div>
        <div class="brand">Safar Sathi</div>
        <h1 class="title">E-Ticket / Itinerary</h1>
      </div>
      <div class="badge ${badgeClass}">${escapeHtml(statusLabel)}</div>
    </div>
    <div class="body">
      ${pendingNotice}
      <dl class="meta">
        <div><dt>Booking ID</dt><dd class="mono">${escapeHtml(booking.bookingId)}</dd></div>
        ${
          booking.tripjackBookingId
            ? `<div><dt>TripJack ID</dt><dd class="mono">${escapeHtml(booking.tripjackBookingId)}</dd></div>`
            : ""
        }
        ${
          pnr
            ? `<div><dt>PNR</dt><dd class="mono pnr">${escapeHtml(pnr)}</dd></div>`
            : ""
        }
        ${
          airlinePnr
            ? `<div><dt>Airline PNR</dt><dd class="mono">${escapeHtml(airlinePnr)}</dd></div>`
            : ""
        }
        <div><dt>Travel date</dt><dd>${escapeHtml(booking.travelDate)}</dd></div>
        ${
          ticketNumber
            ? `<div><dt>Ticket number</dt><dd class="mono">${escapeHtml(ticketNumber)}</dd></div>`
            : ""
        }
      </dl>

      <div class="route">
        <div class="route-top">
          <div class="airline-code">${escapeHtml((booking.airlineCode || "FL").slice(0, 2).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(booking.airlineName)}</strong><br>
            <span style="color:#64748b">${escapeHtml(booking.airlineCode)} ${escapeHtml(booking.flightNumber)}</span>
          </div>
        </div>
        <div class="route-grid">
          <div>
            <div class="time">${escapeHtml(booking.departureTime)}</div>
            <div class="code">${escapeHtml(booking.sourceCode)}</div>
            <div class="city">${escapeHtml(booking.sourceCity || "")}</div>
          </div>
          <div class="mid">
            <div>${escapeHtml(booking.durationFormatted || "")}</div>
            <div>✈</div>
          </div>
          <div>
            <div class="time">${escapeHtml(booking.arrivalTime)}</div>
            <div class="code">${escapeHtml(booking.destinationCode)}</div>
            <div class="city">${escapeHtml(booking.destinationCity || "")}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Passenger</th><th>Type</th><th>PNR / Ticket</th><th>Status</th></tr>
        </thead>
        <tbody>${passengerRows}</tbody>
      </table>

      ${segmentHtml}

      <dl class="fare-box">
        <div><dt>Fare paid</dt><dd class="amount">${escapeHtml(formatCurrency(booking.totalFare, locale))}</dd></div>
        <div><dt>Payment</dt><dd class="capitalize">${escapeHtml(booking.paymentStatus)}</dd></div>
      </dl>

      <div class="footer">
        Support: support@thesafarsathi.com · +91 8354075026<br>
        Please carry a valid government ID matching passenger names.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/** Opens a styled print window — used for both Print and Download (Save as PDF). */
export function openFlightTicketPrintWindow(
  booking: FlightBookingRecord,
  locale: Locale
): void {
  const html = buildFlightTicketPrintHtml(booking, locale);
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!w) {
    window.print();
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.onload = () => {
    window.setTimeout(() => w.print(), 250);
  };
}
