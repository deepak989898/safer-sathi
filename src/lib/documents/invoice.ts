import { jsPDF } from "jspdf";
import { SITE_CONTACT, SITE_NAME, appUrl } from "@/lib/site-config";
import { loadInvoiceLogo } from "@/lib/documents/invoice-logo";
import {
  loadInvoiceServiceImage,
  type InvoiceServiceImage,
} from "@/lib/documents/invoice-service-image";
import type { Booking } from "@/types";

export interface InvoiceData {
  booking: Booking;
  companyName?: string;
  companyAddress?: string;
  gstNumber?: string;
}

// Brand palette
const NAVY = [12, 36, 68] as const;
const ORANGE = [249, 115, 22] as const;
const GREEN = [22, 163, 74] as const;
const GREEN_BG = [240, 253, 244] as const;
const GREEN_BR = [187, 247, 208] as const;
const RED = [220, 38, 38] as const;
const GRAY = [100, 116, 139] as const;
const GRAY_LITE = [248, 250, 252] as const;
const BORDER = [226, 232, 240] as const;
const WHITE = [255, 255, 255] as const;
const SKY = [219, 234, 254] as const;
const AMBER_BG = [255, 251, 235] as const;
const AMBER_BR = [253, 230, 138] as const;

const PW = 210;
const PH = 297;
const ML = 10;
const MR = 10;
const CW = PW - ML - MR;
const BOTTOM_BAR_H = 12;

type RGB = readonly [number, number, number];
type Align = "left" | "center" | "right";

function inr(n: number): string {
  return "\u20b9" + n.toLocaleString("en-IN");
}

function fmtDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function numToWords(n: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) {
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  if (n < 1000) {
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + numToWords(n % 100) : "")
    );
  }
  if (n < 100000) {
    return (
      numToWords(Math.floor(n / 1000)) +
      " Thousand" +
      (n % 1000 ? " " + numToWords(n % 1000) : "")
    );
  }
  if (n < 10000000) {
    return (
      numToWords(Math.floor(n / 100000)) +
      " Lakh" +
      (n % 100000 ? " " + numToWords(n % 100000) : "")
    );
  }
  return (
    numToWords(Math.floor(n / 10000000)) +
    " Crore" +
    (n % 10000000 ? " " + numToWords(n % 10000000) : "")
  );
}

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size: number,
  color: RGB,
  bold = false,
  align: Align = "left",
  italic = false
) {
  const style = bold ? (italic ? "bolditalic" : "bold") : italic ? "italic" : "normal";
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(text, x, y, { align });
}

function box(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: RGB,
  stroke?: RGB,
  r = 2
) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  } else {
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

function sectionHeader(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  color: RGB
) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, 7, 2, 2, "F");
  doc.rect(x, y + 4, w, 3, "F");
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.circle(x + 5, y + 3.5, 2.5, "F");
  txt(doc, title, x + 9.5, y + 5.2, 6.8, WHITE, true);
}

function wrap(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(text, maxW) as string[];
}

function hline(doc: jsPDF, x1: number, y: number, x2: number, color: RGB = BORDER, lw = 0.2) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function vline(doc: jsPDF, x: number, y1: number, y2: number, color: RGB = BORDER) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.2);
  doc.line(x, y1, x, y2);
}

function drawDestinationPanel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  image: InvoiceServiceImage | null,
  serviceType: Booking["serviceType"]
) {
  box(doc, x, y, w, h, SKY, BORDER, 3);

  const pad = 1.5;
  const labelH = 7;
  const imgX = x + pad;
  const imgY = y + pad;
  const imgW = w - pad * 2;
  const imgH = h - pad * 2 - labelH;

  if (image) {
    try {
      doc.addImage(
        `data:image/${image.format.toLowerCase()};base64,${image.base64}`,
        image.format,
        imgX,
        imgY,
        imgW,
        imgH,
        undefined,
        "FAST"
      );
    } catch {
      drawDestinationIcon(doc, x, y, w, h, serviceType, labelH);
      return;
    }
  } else {
    drawDestinationIcon(doc, x, y, w, h, serviceType, labelH);
  }

  box(doc, x + 2, y + h - labelH - 1, w - 4, labelH, NAVY, undefined, 2);
  const svcLabel = wrap(doc, label, w - 8)[0] ?? label;
  txt(doc, svcLabel, x + w / 2, y + h - 3.5, 6, WHITE, true, "center");
}

function drawDestinationIcon(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  serviceType: Booking["serviceType"],
  labelH: number
) {
  const iconY = y + (h - labelH) / 2 - 2;
  doc.setFillColor(191, 219, 254);
  doc.circle(x + w / 2, iconY, 10, "F");
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.circle(x + w / 2, iconY, 8, "F");
  const svcIcon = serviceType.includes("vehicle")
    ? "CAR"
    : serviceType.includes("hotel")
      ? "HTL"
      : "PKG";
  txt(doc, svcIcon, x + w / 2, iconY + 1.5, 7, NAVY, true, "center");
}

function drawWatermark(doc: jsPDF, logo: Awaited<ReturnType<typeof loadInvoiceLogo>>) {
  if (logo) {
    try {
      doc.saveGraphicsState();
      doc.setGState(doc.GState({ opacity: 0.045 }));
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        PW / 2 - 50,
        PH / 2 - 20,
        100,
        40
      );
      doc.restoreGraphicsState();
      return;
    } catch {
      // fall through
    }
  }
  doc.setTextColor(241, 245, 249);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text("SAFAR SATHI", PW / 2, PH / 2, { align: "center", angle: 28 });
}

function drawQrPlaceholder(doc: jsPDF, x: number, y: number, size: number, seed: string) {
  box(doc, x, y, size, size, WHITE, BORDER, 2);
  const cells = 11;
  const pad = 2.2;
  const cell = (size - pad * 2) / cells;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const corner =
        (r < 4 && c < 4) || (r < 4 && c > cells - 5) || (r > cells - 5 && c < 4);
      const fill = corner || ((hash + r * 17 + c * 31) % 5 < 2);
      if (fill) {
        doc.rect(x + pad + c * cell, y + pad + r * cell, cell - 0.15, cell - 0.15, "F");
      }
    }
  }
}

function buildLineItems(booking: Booking, travelRange: string) {
  const typeLabel = booking.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const items: Array<{
    no: string;
    title: string;
    subtitle: string;
    details: string;
    detailSub: string;
    qty: number;
    unitPrice: number;
    amount: number;
    icon: string;
  }> = [
    {
      no: "01",
      title: booking.serviceName.en,
      subtitle: travelRange,
      details: typeLabel,
      detailSub: `${booking.guests} traveler${booking.guests !== 1 ? "s" : ""}`,
      qty: 1,
      unitPrice: booking.amount,
      amount: booking.amount,
      icon: booking.serviceType.includes("vehicle")
        ? "V"
        : booking.serviceType.includes("hotel")
          ? "H"
          : booking.serviceType.includes("package")
            ? "P"
            : "S",
    },
  ];

  if (booking.notes?.trim()) {
    items.push({
      no: "02",
      title: "Special requests / add-ons",
      subtitle: booking.notes.trim().slice(0, 60),
      details: "Included",
      detailSub: "As per booking",
      qty: 1,
      unitPrice: 0,
      amount: 0,
      icon: "+",
    });
  }

  return items;
}

export async function generateInvoice(
  booking: Booking,
  options?: Partial<InvoiceData>
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logo, serviceImage] = await Promise.all([
    loadInvoiceLogo(),
    loadInvoiceServiceImage(booking),
  ]);

  const gstNumber = options?.gstNumber ?? "07AABCS1234F1Z5";
  const companyName = options?.companyName ?? `${SITE_NAME} Tours & Travels`;
  const invoiceDate = fmtDate(new Date().toISOString());
  const travelRange = booking.endDate
    ? `${fmtDate(booking.startDate)} – ${fmtDate(booking.endDate)}`
    : fmtDate(booking.startDate);

  const paidAmt = booking.paidAmount ?? 0;
  const balanceDue = Math.max(0, booking.amount - paidAmt);
  const isPaid = balanceDue <= 0 && paidAmt > 0;
  const isPartial = paidAmt > 0 && balanceDue > 0;

  // GST inclusive — total always matches booking.amount
  const totalAmt = booking.amount;
  const taxable = Math.round(totalAmt / 1.05);
  const gstAmt = totalAmt - taxable;

  const invoiceNo = `SS/INV/${new Date().getFullYear()}/${booking.bookingNumber.replace(/^SS-\d{4}-/, "")}`;
  const myBookingsUrl = appUrl("/my-bookings");

  drawWatermark(doc, logo);

  // Page frame
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(ML - 1.5, 7, CW + 3, PH - 14 - BOTTOM_BAR_H, 3, 3, "S");

  // ── HEADER ────────────────────────────────────────────────────────────────
  const hy = 10;

  doc.setFillColor(241, 245, 249);
  doc.circle(26, hy + 17, 16, "F");

  if (logo) {
    try {
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        12,
        hy + 9,
        28,
        18
      );
    } catch {
      txt(doc, "SS", 26, hy + 20, 16, NAVY, true, "center");
    }
  } else {
    txt(doc, "Safar", 12, hy + 16, 13, NAVY, true);
    txt(doc, "Sathi", 30, hy + 16, 13, ORANGE, true);
  }

  const bx = 48;
  txt(doc, "Safar ", bx, hy + 13, 18, NAVY, true);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text("Sathi", bx + doc.getTextWidth("Safar "), hy + 13);
  txt(doc, "Travel with Trust", bx, hy + 19, 8, GRAY);
  hline(doc, bx, hy + 21, bx + 58);
  txt(doc, "TRAVEL  |  COMFORT  |  TRUST", bx, hy + 26, 6.2, GRAY);

  const invX = 116;
  const invW = PW - invX - MR;
  const invH = 38;
  box(doc, invX, hy, invW, invH, GRAY_LITE, BORDER, 3);

  doc.setFillColor(209, 213, 219);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      doc.circle(invX + invW - 18 + c * 3.5, hy + 3 + r * 3.5, 0.55, "F");
    }
  }

  txt(doc, "INVOICE", invX + invW - 5, hy + 12, 19, NAVY, true, "right");

  const meta: [string, string][] = [
    ["Invoice No.", invoiceNo],
    ["Invoice Date", invoiceDate],
    ["Booking ID", booking.bookingNumber],
  ];
  let my = hy + 19;
  for (const [k, v] of meta) {
    txt(doc, k, invX + 5, my, 6.8, GRAY);
    txt(doc, v, invX + 30, my, 6.8, NAVY, true);
    my += 5;
  }

  const statusLabel = isPaid ? "Paid" : isPartial ? "Partial" : "Pending";
  const statusBg = isPaid ? GREEN_BG : isPartial ? AMBER_BG : [254, 242, 242] as const;
  const statusBr = isPaid ? GREEN_BR : isPartial ? AMBER_BR : [254, 202, 202] as const;
  const statusClr = isPaid ? GREEN : isPartial ? ORANGE : RED;
  txt(doc, "Payment Status", invX + 5, my, 6.8, GRAY);
  box(doc, invX + 30, my - 4.2, 20, 5.5, statusBg, statusBr, 2);
  txt(doc, statusLabel, invX + 40, my, 6.8, statusClr, true, "center");

  const divY = hy + invH + 4;
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(ML, divY, CW, 1, "F");

  // ── BILL TO | TRIP | IMAGE ───────────────────────────────────────────────
  const sY = divY + 4;
  const sH = 38;
  const col1 = 56;
  const col2 = 66;
  const col3 = CW - col1 - col2 - 4;
  const x1 = ML;
  const x2 = x1 + col1 + 2;
  const x3 = x2 + col2 + 2;

  box(doc, x1, sY, col1, sH, GRAY_LITE, BORDER, 2);
  sectionHeader(doc, x1, sY, col1, "BILL TO", NAVY);
  txt(doc, booking.customerName, x1 + 3, sY + 12, 9, NAVY, true);
  const billLines = [
    `Ph: ${booking.customerPhone}`,
    `Email: ${booking.customerEmail}`,
  ];
  let by = sY + 18;
  for (const line of billLines) {
    for (const part of wrap(doc, line, col1 - 6)) {
      txt(doc, part, x1 + 3, by, 6.8, GRAY);
      by += 4.5;
    }
  }

  box(doc, x2, sY, col2, sH, GRAY_LITE, BORDER, 2);
  sectionHeader(doc, x2, sY, col2, "TRIP DETAILS", ORANGE);
  const trip: [string, string][] = [
    ["Service", booking.serviceName.en],
    ["Type", booking.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())],
    ["Travel Date", travelRange],
    ["Travelers", `${booking.guests} Adult${booking.guests !== 1 ? "s" : ""}`],
    ["Booked On", fmtDate(booking.createdAt)],
  ];
  let ty = sY + 12;
  for (const [k, v] of trip) {
    txt(doc, k, x2 + 3, ty, 6.5, GRAY);
    for (const [i, part] of wrap(doc, v, col2 - 30).entries()) {
      txt(doc, part, x2 + 24, ty + i * 4.2, 6.5, NAVY, true);
    }
    ty += 5.2;
  }

  drawDestinationPanel(
    doc,
    x3,
    sY,
    col3,
    sH,
    booking.serviceName.en,
    serviceImage,
    booking.serviceType
  );

  // ── TABLE ───────────────────────────────────────────────────────────────
  const tblY = sY + sH + 4;
  const cols = {
    num: ML + 3,
    desc: ML + 12,
    details: ML + 78,
    qty: ML + 118,
    unit: ML + 132,
    amt: ML + CW - 3,
  };

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(ML, tblY, CW, 7.5, 2, 2, "F");
  doc.rect(ML, tblY + 4, CW, 3.5, "F");
  txt(doc, "#", cols.num, tblY + 5.2, 6.5, WHITE, true);
  txt(doc, "DESCRIPTION", cols.desc, tblY + 5.2, 6.5, WHITE, true);
  txt(doc, "DETAILS", cols.details, tblY + 5.2, 6.5, WHITE, true);
  txt(doc, "QTY", cols.qty, tblY + 5.2, 6.5, WHITE, true);
  txt(doc, "UNIT PRICE", cols.unit, tblY + 5.2, 6.5, WHITE, true);
  txt(doc, "AMOUNT", cols.amt, tblY + 5.2, 6.5, WHITE, true, "right");

  const items = buildLineItems(booking, travelRange);
  let rowY = tblY + 7.5;
  const rowH = 14;

  for (const item of items) {
    box(doc, ML, rowY, CW, rowH, WHITE, BORDER, 0);
    vline(doc, ML + 10, rowY, rowY + rowH);
    vline(doc, ML + 74, rowY, rowY + rowH);
    vline(doc, ML + 116, rowY, rowY + rowH);
    vline(doc, ML + 130, rowY, rowY + rowH);
    vline(doc, ML + 158, rowY, rowY + rowH);

    txt(doc, item.no, cols.num + 2, rowY + 6, 7.5, NAVY, true, "center");
    doc.setFillColor(239, 246, 255);
    doc.circle(cols.desc + 4, rowY + 6.5, 4, "F");
    txt(doc, item.icon, cols.desc + 4, rowY + 7.5, 6.5, NAVY, true, "center");

    txt(doc, item.title, cols.desc + 10, rowY + 5.5, 7.5, NAVY, true);
    txt(doc, item.subtitle, cols.desc + 10, rowY + 10.5, 6, GRAY);
    txt(doc, item.details, cols.details, rowY + 5.5, 6.5, GRAY);
    txt(doc, item.detailSub, cols.details, rowY + 10.5, 6, GRAY);
    txt(doc, String(item.qty), cols.qty + 4, rowY + 7.5, 7.5, NAVY, true, "center");
    txt(doc, item.unitPrice > 0 ? inr(item.unitPrice) : "-", cols.unit + 10, rowY + 7.5, 7, NAVY, true, "center");
    txt(doc, item.amount > 0 ? inr(item.amount) : "-", cols.amt, rowY + 7.5, 8, NAVY, true, "right");

    rowY += rowH;
  }

  // spacer row
  box(doc, ML, rowY, CW, 6, [252, 252, 253] as const, BORDER, 0);
  rowY += 6;

  // ── PAYMENT | THANK YOU | TOTALS ────────────────────────────────────────
  const pY = rowY + 4;
  const pH = 48;
  const pW1 = 56;
  const pW2 = 54;
  const pW3 = CW - pW1 - pW2 - 4;
  const pX1 = ML;
  const pX2 = pX1 + pW1 + 2;
  const pX3 = pX2 + pW2 + 2;

  box(doc, pX1, pY, pW1, pH, GRAY_LITE, BORDER, 2);
  sectionHeader(doc, pX1, pY, pW1, "PAYMENT INFORMATION", NAVY);
  const payRows: [string, string][] = [
    ["Method", "Online / Razorpay"],
    ["Txn ID", booking.bookingNumber],
    ["Paid", inr(paidAmt)],
    ["Date", fmtDate(booking.updatedAt ?? booking.createdAt)],
  ];
  let py = pY + 12;
  for (const [k, v] of payRows) {
    txt(doc, k, pX1 + 3, py, 6.2, GRAY);
    for (const [i, part] of wrap(doc, v, pW1 - 22).entries()) {
      txt(doc, part, pX1 + 18, py + i * 4, 6.2, NAVY, true);
    }
    py += 5.5;
  }
  const badgeText = isPaid
    ? "Paid Successfully"
    : isPartial
      ? `Partial — ${inr(balanceDue)} due`
      : "Payment Pending";
  const badgeClr = isPaid ? GREEN : isPartial ? ORANGE : RED;
  const badgeBg = isPaid ? GREEN_BG : isPartial ? AMBER_BG : [254, 242, 242] as const;
  const badgeBr = isPaid ? GREEN_BR : isPartial ? AMBER_BR : [254, 202, 202] as const;
  box(doc, pX1 + 3, pY + pH - 8.5, pW1 - 6, 6.5, badgeBg, badgeBr, 2);
  txt(doc, badgeText, pX1 + pW1 / 2, pY + pH - 4.5, 6.5, badgeClr, true, "center");

  box(doc, pX2, pY, pW2, pH, AMBER_BG, AMBER_BR, 2);
  txt(doc, "\u201c", pX2 + 4, pY + 11, 20, ORANGE, true);
  txt(doc, "\u201d", pX2 + pW2 - 7, pY + 20, 20, ORANGE, true);
  const quote = [
    "Thank you for choosing",
    "Safar Sathi.",
    "We look forward to",
    "serving you again.",
  ];
  let qy = pY + 18;
  for (const line of quote) {
    txt(doc, line, pX2 + pW2 / 2, qy, 7, NAVY, false, "center", true);
    qy += 5;
  }
  txt(doc, "Team Safar Sathi", pX2 + pW2 / 2, pY + pH - 5, 8.5, ORANGE, true, "center", true);

  box(doc, pX3, pY, pW3, pH, GRAY_LITE, BORDER, 2);
  const totals: [string, string, RGB][] = [
    ["Subtotal", inr(taxable), NAVY],
    ["Discount", "- " + inr(0), RED],
    ["Taxable Amount", inr(taxable), NAVY],
    ["GST (5%)", inr(gstAmt), NAVY],
  ];
  let totY = pY + 8;
  for (const [label, value, clr] of totals) {
    txt(doc, label, pX3 + 4, totY, 7, GRAY);
    txt(doc, value, pX3 + pW3 - 4, totY, 7, clr, false, "right");
    hline(doc, pX3 + 3, totY + 2, pX3 + pW3 - 3);
    totY += 7.5;
  }
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(pX3, totY - 1, pW3, 11, "F");
  txt(doc, "TOTAL AMOUNT", pX3 + 4, totY + 4, 7, WHITE, true);
  txt(doc, inr(totalAmt), pX3 + pW3 - 4, totY + 4, 10, ORANGE, true, "right");
  const words = `(Rupees ${numToWords(totalAmt)} Only)`;
  for (const [i, part] of wrap(doc, words, pW3 - 8).entries()) {
    txt(doc, part, pX3 + 4, totY + 8 + i * 3.5, 5, [200, 210, 225], false);
  }

  // ── FOOTER (anchored above bottom bar) ──────────────────────────────────
  const barY = PH - BOTTOM_BAR_H;
  const fY = pY + pH + 6;
  const fH = barY - fY - 3;

  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(ML, fY, CW, 0.7, "F");

  const fCol = CW / 3;
  const f1 = ML;
  const f2 = ML + fCol;
  const f3 = ML + fCol * 2;

  txt(doc, "TERMS & CONDITIONS", f1 + 1, fY + 7, 7, NAVY, true);
  hline(doc, f1, fY + 8.5, f1 + fCol - 3, ORANGE, 0.4);
  const terms = [
    "Payment as per booking confirmation.",
    "Cancellations per Safar Sathi policy.",
    "Carry valid photo ID during travel.",
    "24/7 support: " + SITE_CONTACT.phone,
    `GSTIN: ${gstNumber}`,
  ];
  let tY = fY + 13;
  for (const t of terms) {
    for (const part of wrap(doc, "\u2022 " + t, fCol - 6)) {
      txt(doc, part, f1 + 2, tY, 6, GRAY);
      tY += 4.5;
    }
  }

  txt(doc, "SCAN & DOWNLOAD", f2 + fCol / 2, fY + 7, 7, NAVY, true, "center");
  hline(doc, f2, fY + 8.5, f2 + fCol - 3, ORANGE, 0.4);
  txt(doc, "Scan to open My Bookings", f2 + fCol / 2, fY + 13, 6, GRAY, false, "center");
  const qrSize = Math.min(22, fH - 18);
  drawQrPlaceholder(doc, f2 + (fCol - qrSize) / 2, fY + 16, qrSize, booking.id + booking.bookingNumber);
  txt(
    doc,
    myBookingsUrl.replace(/^https?:\/\/(www\.)?/, ""),
    f2 + fCol / 2,
    fY + 16 + qrSize + 4,
    5.5,
    GRAY,
    false,
    "center"
  );

  txt(doc, "WE ARE HERE TO HELP", f3 + 1, fY + 7, 7, NAVY, true);
  hline(doc, f3, fY + 8.5, f3 + fCol - 2, ORANGE, 0.4);
  const contacts = [
    ["24/7 Support", SITE_CONTACT.phone],
    ["Email", SITE_CONTACT.email],
    ["Website", appUrl().replace(/^https?:\/\//, "")],
  ];
  let cY = fY + 13;
  for (const [k, v] of contacts) {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.circle(f3 + 5, cY - 1.2, 2.8, "F");
    txt(doc, k.slice(0, 1), f3 + 5, cY, 5, WHITE, true, "center");
    txt(doc, `${k}: ${v}`, f3 + 10, cY, 6.2, GRAY);
    cY += 6.5;
  }
  txt(doc, "FOLLOW US", f3 + 1, cY + 1, 6.5, NAVY, true);
  const socialColors: RGB[] = [
    [59, 89, 152],
    [0, 119, 181],
    [29, 161, 242],
    [255, 0, 0],
  ];
  let sx = f3 + 2;
  for (const color of socialColors) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(sx + 4, cY + 7, 3.5, "F");
    sx += 11;
  }

  // ── BOTTOM BAR ────────────────────────────────────────────────────────────
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, barY, PW, BOTTOM_BAR_H, "F");
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.circle(14, barY + BOTTOM_BAR_H / 2, 3, "F");
  txt(doc, SITE_CONTACT.addressFull, 20, barY + 7.8, 6.5, [186, 198, 214]);
  txt(
    doc,
    `\u00a9 ${new Date().getFullYear()} ${companyName}. All rights reserved.`,
    PW - MR,
    barY + 7.8,
    6,
    [148, 163, 184],
    false,
    "right"
  );
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(PW - 20, barY, 20, BOTTOM_BAR_H, "F");
  txt(doc, "\u2708", PW - 10, barY + 7.8, 10, WHITE, true, "center");

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function generateInvoiceBase64(booking: Booking): Promise<string> {
  const pdf = await generateInvoice(booking);
  return Buffer.from(pdf).toString("base64");
}
