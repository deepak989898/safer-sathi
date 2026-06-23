import { jsPDF } from "jspdf";
import { SITE_CONTACT, SITE_NAME, appUrl } from "@/lib/site-config";
import { loadInvoiceLogo } from "@/lib/documents/invoice-logo";
import type { Booking } from "@/types";

export interface InvoiceData {
  booking: Booking;
  companyName?: string;
  companyAddress?: string;
  gstNumber?: string;
}

// ─── Colours ───────────────────────────────────────────────────────────────
const NAVY      = [12, 36, 68] as const;
const ORANGE    = [249, 115, 22] as const;
const GREEN     = [22, 163, 74] as const;
const GREEN_BG  = [240, 253, 244] as const;
const GREEN_BR  = [187, 247, 208] as const;
const AMBER     = [249, 168, 37] as const;
const AMBER_BG  = [254, 252, 232] as const;
const AMBER_BR  = [253, 230, 138] as const;
const RED       = [220, 38, 38] as const;
const GRAY_MID  = [100, 116, 139] as const;
const GRAY_LITE = [248, 250, 252] as const;
const BORDER    = [226, 232, 240] as const;
const WHITE     = [255, 255, 255] as const;

// Page dims (A4 portrait mm)
const PW = 210;
const PH = 297;
const ML = 11;   // margin left
const MR = 11;   // margin right
const CW = PW - ML - MR; // 188 mm

// ─── Helpers ───────────────────────────────────────────────────────────────
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
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
  return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
}

type Align = "left" | "center" | "right";

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size: number,
  color: readonly number[],
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

function fillBox(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  fill: readonly number[],
  stroke?: readonly number[],
  r = 2,
  lw = 0.3
) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.setLineWidth(lw);
    doc.roundedRect(x, y, w, h, r, r, "FD");
  } else {
    doc.roundedRect(x, y, w, h, r, r, "F");
  }
}

function hline(
  doc: jsPDF,
  x1: number, y: number, x2: number,
  color: readonly number[] = BORDER,
  lw = 0.25
) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

// ─── Main generator ────────────────────────────────────────────────────────
export async function generateInvoice(
  booking: Booking,
  options?: Partial<InvoiceData>
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadInvoiceLogo();

  const gstNumber = options?.gstNumber ?? "07AABCS1234F1Z5";
  const companyName = options?.companyName ?? `${SITE_NAME} Tours & Travels`;

  const invoiceDate = fmtDate(new Date().toISOString());
  const travelRange = booking.endDate
    ? `${fmtDate(booking.startDate)} – ${fmtDate(booking.endDate)}`
    : fmtDate(booking.startDate);
  const balanceDue = Math.max(0, booking.amount - (booking.paidAmount ?? 0));
  const isPaid = balanceDue <= 0;
  const subtotal = booking.amount;
  const gstAmt = Math.round(subtotal * 0.05);
  const totalAmt = subtotal + gstAmt;
  const paidAmt = booking.paidAmount ?? 0;

  // Invoice number from booking number
  const invoiceNo = `SS/INV/${new Date().getFullYear()}/${booking.bookingNumber.replace(/SS-\d{4}-/, "")}`;

  // ─── WATERMARK ────────────────────────────────────────────────────────────
  if (logo) {
    try {
      doc.saveGraphicsState();
      doc.setGState(doc.GState({ opacity: 0.05 }));
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        PW / 2 - 55, PH / 2 - 22, 110, 44
      );
      doc.restoreGraphicsState();
    } catch { /* skip */ }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HEADER (y: 8–48)
  // Left half: logo + brand name  |  Right half: INVOICE details box
  // ──────────────────────────────────────────────────────────────────────────
  const headerY = 8;

  // Background light circle for logo
  doc.setFillColor(241, 245, 249);
  doc.circle(28, headerY + 18, 18, "F");

  // Logo image or text fallback
  if (logo) {
    try {
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        13, headerY + 8, 30, 20
      );
    } catch {
      txt(doc, "SS", 28, headerY + 22, 18, NAVY, true, "center");
    }
  } else {
    // Plain text logo fallback
    txt(doc, "Safar", 13, headerY + 15, 14, NAVY, true);
    txt(doc, "Sathi", 36, headerY + 15, 14, ORANGE, true);
    txt(doc, "Travel with Trust", 13, headerY + 22, 8, GRAY_MID);
  }

  // Brand name (right of logo circle)
  const brandX = 51;
  txt(doc, "Safar ", brandX, headerY + 14, 19, NAVY, true);
  // "Sathi" in orange right after
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  const safarW = doc.getTextWidth("Safar ");
  doc.text("Sathi", brandX + safarW, headerY + 14);

  txt(doc, "Travel with Trust", brandX, headerY + 21, 8.5, GRAY_MID);

  // Thin line under tagline
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(brandX, headerY + 23, brandX + 60, headerY + 23);

  // Tagline row
  txt(doc, "TRAVEL   |   COMFORT   |   TRUST", brandX, headerY + 29, 6.5, GRAY_MID);

  // ── INVOICE box (right side) ──────────────────────────────────────────────
  const invBoxX = 118;
  const invBoxW = PW - invBoxX - MR;  // ~81mm
  const invBoxH = 40;

  fillBox(doc, invBoxX, headerY, invBoxW, invBoxH, GRAY_LITE, BORDER, 3);

  // Dot decoration (top-right of box)
  doc.setFillColor(209, 213, 219);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      doc.circle(invBoxX + invBoxW - 16 + col * 4, headerY + 4 + row * 4, 0.6, "F");
    }
  }

  // "INVOICE" title
  txt(doc, "INVOICE", invBoxX + invBoxW - 4, headerY + 13, 20, NAVY, true, "right");

  // Detail rows inside invoice box
  const ivRows: [string, string][] = [
    ["Invoice No.", `:  ${invoiceNo}`],
    ["Invoice Date", `:  ${invoiceDate}`],
    ["Booking ID", `:  ${booking.bookingNumber}`],
  ];
  let ivY = headerY + 21;
  for (const [k, v] of ivRows) {
    txt(doc, k, invBoxX + 4, ivY, 7, GRAY_MID);
    txt(doc, v, invBoxX + 30, ivY, 7, NAVY, true);
    ivY += 5.5;
  }

  // Payment status badge
  const statusText = isPaid ? "Paid" : balanceDue < booking.amount ? "Partial" : "Pending";
  const badgeBg  = isPaid ? GREEN_BG : [255, 247, 237] as const;
  const badgeBr  = isPaid ? GREEN_BR : [254, 215, 170] as const;
  const badgeClr = isPaid ? GREEN : ORANGE;
  txt(doc, "Payment Status", invBoxX + 4, ivY, 7, GRAY_MID);
  fillBox(doc, invBoxX + 30, ivY - 4.5, 22, 6, badgeBg, badgeBr, 2);
  txt(doc, statusText, invBoxX + 41, ivY, 7, badgeClr, true, "center");

  // ── Orange divider ─────────────────────────────────────────────────────────
  const divY = headerY + invBoxH + 4;
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(ML, divY, CW, 1.2, "F");

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 2: BILL TO | TRIP DETAILS | SERVICE IMAGE  (y: divY+5 … +40)
  // ──────────────────────────────────────────────────────────────────────────
  const s2Y = divY + 5;
  const s2H = 40;

  // Column widths: 58 | 66 | 60 → total 184 (CW fits)
  const btW  = 58;
  const tdW  = 68;
  const imgW = CW - btW - tdW - 4;  // ~58mm
  const btX  = ML;
  const tdX  = btX + btW + 2;
  const imgX = tdX + tdW + 2;

  // ── BILL TO ───────────────────────────────────────────────────────────────
  fillBox(doc, btX, s2Y, btW, s2H, GRAY_LITE, BORDER, 2);
  // Navy header bar
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(btX, s2Y, btW, 7, 2, 2, "F");
  doc.rect(btX, s2Y + 4, btW, 3, "F"); // square bottom corners of header
  // Person icon circle
  doc.setFillColor(255, 255, 255);
  doc.circle(btX + 5.5, s2Y + 3.5, 2.8, "F");
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.circle(btX + 5.5, s2Y + 3.5, 1.2, "F");
  txt(doc, "BILL TO", btX + 10, s2Y + 5, 7, WHITE, true);

  txt(doc, booking.customerName, btX + 3, s2Y + 14, 9, NAVY, true);
  const btLines: [string, string][] = [
    ["\u260e", booking.customerPhone],
    ["\u2709", booking.customerEmail],
    ["\u25ce", SITE_CONTACT.addressLine1],
    ["", SITE_CONTACT.addressLine2],
  ];
  let bty = s2Y + 21;
  for (const [icon, line] of btLines) {
    if (icon) {
      txt(doc, icon + " " + line, btX + 3, bty, 7, GRAY_MID);
    } else {
      txt(doc, "   " + line, btX + 3, bty, 7, GRAY_MID);
    }
    bty += 5;
  }

  // ── TRIP DETAILS ──────────────────────────────────────────────────────────
  fillBox(doc, tdX, s2Y, tdW, s2H, GRAY_LITE, BORDER, 2);
  // Orange header bar
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.roundedRect(tdX, s2Y, tdW, 7, 2, 2, "F");
  doc.rect(tdX, s2Y + 4, tdW, 3, "F");
  // Suitcase icon circle
  doc.setFillColor(255, 255, 255);
  doc.circle(tdX + 5.5, s2Y + 3.5, 2.8, "F");
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(tdX + 3.8, s2Y + 2.5, 3.4, 2.5, "F");
  txt(doc, "TRIP DETAILS", tdX + 10, s2Y + 5, 7, WHITE, true);

  const tripRows: [string, string][] = [
    ["Service",      booking.serviceName.en],
    ["Type",         booking.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())],
    ["Travel Date",  travelRange],
    ["Travelers",    `${booking.guests} Adult${booking.guests !== 1 ? "s" : ""}`],
    ["Booking Date", fmtDate(booking.createdAt)],
  ];
  let tdy = s2Y + 13;
  for (const [k, v] of tripRows) {
    txt(doc, k, tdX + 3, tdy, 7, GRAY_MID);
    txt(doc, ":", tdX + 26, tdy, 7, GRAY_MID);
    const maxLen = 22;
    const display = v.length > maxLen ? v.substring(0, maxLen - 1) + "\u2026" : v;
    txt(doc, display, tdX + 29, tdy, 7, NAVY, true);
    tdy += 5;
  }

  // ── Image / Destination panel ──────────────────────────────────────────────
  fillBox(doc, imgX, s2Y, imgW, s2H, [220, 232, 249] as const, BORDER, 3);
  // Diagonal stripe texture (decorative)
  doc.setDrawColor(200, 215, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= imgW + s2H; i += 6) {
    doc.line(imgX + Math.max(0, i - s2H), s2Y + Math.min(i, s2H), imgX + Math.min(i, imgW), s2Y + Math.max(0, i - imgW));
  }

  // Icon circle (centre of image)
  const iconCX = imgX + imgW / 2;
  const iconCY = s2Y + 14;
  doc.setFillColor(255, 255, 255);
  doc.circle(iconCX, iconCY, 9, "F");
  // Service icon initial(s)
  const svcInitial = booking.serviceType.startsWith("vehicle") ? "CAR"
    : booking.serviceType.startsWith("hotel") ? "HTL"
    : booking.serviceType.startsWith("package") ? "PKG"
    : "SRV";
  txt(doc, svcInitial, iconCX, iconCY + 2, 7, NAVY, true, "center");

  // Service name at bottom of panel
  fillBox(doc, imgX + 2, s2Y + s2H - 8, imgW - 4, 6, NAVY, undefined, 2);
  const svcLabel = booking.serviceName.en.length > 20
    ? booking.serviceName.en.substring(0, 19) + "\u2026"
    : booking.serviceName.en;
  txt(doc, "\u25cf  " + svcLabel, imgX + imgW / 2, s2Y + s2H - 4, 6.5, WHITE, true, "center");

  // ──────────────────────────────────────────────────────────────────────────
  // SERVICE TABLE  (y: s2Y + s2H + 6 …)
  // ──────────────────────────────────────────────────────────────────────────
  const tblY = s2Y + s2H + 5;

  // Header row
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(ML, tblY, CW, 8, 2, 2, "F");
  doc.rect(ML, tblY + 4, CW, 4, "F");

  // Column positions (x left edge)
  const C = {
    num:     ML + 4,
    desc:    ML + 14,
    details: ML + 80,
    qty:     ML + 122,
    uPrice:  ML + 138,
    amount:  ML + CW - 2,
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text("#",               C.num,     tblY + 5.5);
  doc.text("DESCRIPTION",     C.desc,    tblY + 5.5);
  doc.text("DETAILS",         C.details, tblY + 5.5);
  doc.text("QTY",             C.qty,     tblY + 5.5);
  doc.text("UNIT PRICE",      C.uPrice,  tblY + 5.5);
  doc.text("AMOUNT",          C.amount,  tblY + 5.5, { align: "right" });

  // Single data row
  const rowH = 16;
  const rowY = tblY + 8;
  fillBox(doc, ML, rowY, CW, rowH, WHITE, BORDER, 0);
  hline(doc, ML, rowY + rowH, ML + CW, BORDER);

  // Row number
  txt(doc, "01", C.num, rowY + 6, 8, NAVY, true, "center");

  // Icon circle
  doc.setFillColor(239, 246, 255);
  doc.circle(C.desc + 5, rowY + 7, 4.5, "F");
  txt(doc, svcInitial[0], C.desc + 5, rowY + 8.5, 7, NAVY, true, "center");

  // Description
  const descMaxLen = 28;
  const descLine1 = booking.serviceName.en.length > descMaxLen
    ? booking.serviceName.en.substring(0, descMaxLen - 1) + "\u2026"
    : booking.serviceName.en;
  txt(doc, descLine1, C.desc + 12, rowY + 6, 8, NAVY, true);
  txt(doc, travelRange, C.desc + 12, rowY + 12, 6.5, GRAY_MID);

  // Details
  const typeLabel = booking.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  txt(doc, typeLabel, C.details, rowY + 6, 7, GRAY_MID);
  txt(doc, `${booking.guests} Guest${booking.guests !== 1 ? "s" : ""}`, C.details, rowY + 12, 7, GRAY_MID);

  // Qty
  txt(doc, String(booking.guests), C.qty + 5, rowY + 8, 8.5, NAVY, true, "center");

  // Unit price
  txt(doc, inr(booking.amount), C.uPrice + 12, rowY + 8, 8, NAVY, true, "center");

  // Amount
  txt(doc, inr(booking.amount), C.amount, rowY + 8, 9, NAVY, true, "right");

  // Empty row spacer row
  const row2Y = rowY + rowH;
  fillBox(doc, ML, row2Y, CW, 8, [252, 252, 253] as const, BORDER, 0);
  hline(doc, ML, row2Y + 8, ML + CW, BORDER);

  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT INFO  |  THANK YOU  |  TOTALS  (y: row2Y+8+6 …)
  // ──────────────────────────────────────────────────────────────────────────
  const psecY = row2Y + 8 + 5;
  const psecH = 52;

  // Column widths: 58 | 56 | rest
  const piW = 58;
  const tyW = 56;
  const totW = CW - piW - tyW - 4;
  const piX  = ML;
  const tyX  = piX + piW + 2;
  const totX = tyX + tyW + 2;

  // ── PAYMENT INFORMATION ───────────────────────────────────────────────────
  fillBox(doc, piX, psecY, piW, psecH, GRAY_LITE, BORDER, 2);
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.roundedRect(piX, psecY, piW, 7, 2, 2, "F");
  doc.rect(piX, psecY + 4, piW, 3, "F");
  // Credit card icon circles
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(piX + 3, psecY + 2, 5, 3.5, "F");
  txt(doc, "PAYMENT INFORMATION", piX + 3, psecY + 5.5, 5.5, WHITE, true);

  const payDate = booking.updatedAt ? fmtDate(booking.updatedAt) : invoiceDate;
  const payRows: [string, string][] = [
    ["Payment Method",  "Online / Razorpay"],
    ["Transaction ID",  booking.bookingNumber],
    ["Amount Paid",     inr(paidAmt)],
    ["Payment Date",    payDate],
  ];
  let py = psecY + 14;
  for (const [k, v] of payRows) {
    txt(doc, k, piX + 3, py, 6.5, GRAY_MID);
    txt(doc, ":", piX + 30, py, 6.5, GRAY_MID);
    txt(doc, v, piX + 32, py, 6.5, NAVY, true);
    py += 6;
  }

  // Paid badge
  fillBox(doc, piX + 3, psecY + psecH - 9, piW - 6, 7, isPaid ? GREEN_BG : [255, 247, 237], isPaid ? GREEN_BR : [254, 215, 170] as const, 2);
  const paidBadgeText = isPaid ? "\u2713  Paid Successfully" : "\u23f3  Partial Payment";
  const paidBadgeColor = isPaid ? GREEN : ORANGE;
  txt(doc, paidBadgeText, piX + piW / 2, psecY + psecH - 4.5, 7, paidBadgeColor, true, "center");

  // ── THANK YOU QUOTE ───────────────────────────────────────────────────────
  fillBox(doc, tyX, psecY, tyW, psecH, AMBER_BG, AMBER_BR, 2);

  // Large quotation marks
  txt(doc, "\u201c", tyX + 4, psecY + 12, 22, AMBER, true);
  txt(doc, "\u201d", tyX + tyW - 8, psecY + 22, 22, AMBER, true);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  const qLines = [
    "Thank you for",
    "choosing Safar Sathi.",
    "We look forward",
    "to serving you again.",
  ];
  let qy = psecY + 20;
  for (const line of qLines) {
    doc.text(line, tyX + tyW / 2, qy, { align: "center" });
    qy += 5.5;
  }
  // Cursive-style signature
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(9);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text("Team Safar Sathi", tyX + tyW / 2, psecY + psecH - 5, { align: "center" });

  // ── TOTALS BOX ────────────────────────────────────────────────────────────
  fillBox(doc, totX, psecY, totW, psecH, GRAY_LITE, BORDER, 2);

  const totInner = [
    { label: "Subtotal",        value: inr(subtotal),  clr: NAVY as readonly number[],      bold: false },
    { label: "Discount",        value: "- " + inr(0),  clr: RED  as readonly number[],      bold: false },
    { label: "Taxable Amount",  value: inr(subtotal),  clr: NAVY as readonly number[],      bold: false },
    { label: "GST (5%)",        value: inr(gstAmt),    clr: NAVY as readonly number[],      bold: false },
  ];

  let totRowY = psecY + 9;
  for (const row of totInner) {
    txt(doc, row.label, totX + 4, totRowY, 7.5, GRAY_MID);
    txt(doc, row.value, totX + totW - 4, totRowY, 7.5, row.clr, row.bold, "right");
    hline(doc, totX + 3, totRowY + 2.5, totX + totW - 3, BORDER);
    totRowY += 8.5;
  }

  // Total amount navy box
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(totX, totRowY - 1, totW, 12, "F");
  txt(doc, "TOTAL AMOUNT", totX + 4, totRowY + 4.5, 7.5, WHITE, true);
  txt(doc, inr(totalAmt), totX + totW - 4, totRowY + 4.5, 10, ORANGE as readonly number[], true, "right");

  // Amount in words (small, below total)
  const words = numToWords(totalAmt);
  const wordsLine = `(${words} Only)`;
  txt(doc, wordsLine.length > 36 ? wordsLine.substring(0, 35) + "\u2026" : wordsLine,
    totX + 4, totRowY + 9.5, 5.5, [190, 200, 215], false);

  // ──────────────────────────────────────────────────────────────────────────
  // FOOTER  (y: psecY + psecH + 8 …)
  // ──────────────────────────────────────────────────────────────────────────
  const fY = psecY + psecH + 7;

  // Orange top border
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(ML, fY, CW, 0.8, "F");

  const fH = 42;
  const fColW = CW / 3;

  // ── LEFT: Terms & Conditions ───────────────────────────────────────────────
  const tncX = ML;
  txt(doc, "TERMS & CONDITIONS", tncX + 1, fY + 8, 7.5, NAVY, true);
  hline(doc, tncX, fY + 10, tncX + fColW - 2, ORANGE, 0.5);

  const terms = [
    "Full payment received for the above booking.",
    "Cancellations subject to our cancellation policy.",
    "Please carry valid photo ID during travel.",
    "For queries, contact our 24/7 support.",
    `GST No.: ${gstNumber}`,
  ];
  let termy = fY + 16;
  for (const t of terms) {
    txt(doc, "\u2022  " + t, tncX + 2, termy, 6.5, GRAY_MID);
    termy += 5.5;
  }

  // ── MIDDLE: Scan & Download ────────────────────────────────────────────────
  const scanX = ML + fColW;
  txt(doc, "SCAN & DOWNLOAD", scanX + fColW / 2, fY + 8, 7.5, NAVY, true, "center");
  hline(doc, scanX, fY + 10, scanX + fColW - 2, ORANGE, 0.5);
  txt(doc, "Scan the QR code to", scanX + fColW / 2, fY + 15, 6.5, GRAY_MID, false, "center");
  txt(doc, "download your itinerary", scanX + fColW / 2, fY + 20, 6.5, GRAY_MID, false, "center");

  // QR placeholder
  const qrX = scanX + (fColW - 22) / 2;
  const qrY = fY + 22;
  fillBox(doc, qrX, qrY, 22, 22, WHITE, BORDER, 2);
  // Simple QR-like pattern
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  for (let qi = 0; qi < 5; qi++) {
    for (let qj = 0; qj < 5; qj++) {
      const cell = [
        [1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1],
      ];
      if (cell[qi]?.[qj]) {
        doc.rect(qrX + 3 + qj * 3.2, qrY + 3 + qi * 3.2, 2.8, 2.8, "F");
      }
    }
  }
  txt(doc, appUrl("/my-bookings").replace("https://www.", "").replace("https://", ""),
    scanX + fColW / 2, qrY + 25, 5.5, GRAY_MID, false, "center");

  // ── RIGHT: Contact & Social ────────────────────────────────────────────────
  const cntX = ML + fColW * 2;
  txt(doc, "WE ARE HERE TO HELP", cntX + 1, fY + 8, 7.5, NAVY, true);
  hline(doc, cntX, fY + 10, cntX + fColW, ORANGE, 0.5);

  const cntRows: [string, string][] = [
    ["\u260e", SITE_CONTACT.phone],
    ["\u2709", SITE_CONTACT.email],
    ["\u25cb", appUrl().replace("https://", "")],
  ];
  let cy = fY + 16;
  for (const [icon, value] of cntRows) {
    // Icon circle
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.circle(cntX + 5, cy - 1.5, 3, "F");
    txt(doc, icon, cntX + 5, cy, 5.5, WHITE, true, "center");
    txt(doc, value, cntX + 11, cy, 7, GRAY_MID);
    cy += 7;
  }

  // Social icons row
  txt(doc, "FOLLOW US", cntX + 1, cy + 3, 7, NAVY, true);
  const socials: [string, readonly number[]][] = [
    ["f", [59, 89, 152]],
    ["in", [0, 119, 181]],
    ["t", [29, 161, 242]],
    ["yt", [255, 0, 0]],
  ];
  let sx = cntX + 2;
  for (const [letter, color] of socials) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(sx + 4, cy + 10, 4, "F");
    txt(doc, letter, sx + 4, cy + 11.5, 5.5, WHITE, true, "center");
    sx += 12;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BOTTOM BAR
  // ──────────────────────────────────────────────────────────────────────────
  const barY = PH - 14;
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, barY, PW, 14, "F");

  // Location pin circle
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.circle(16, barY + 7, 3.5, "F");
  txt(doc, "\u25cf", 16, barY + 8.5, 7, WHITE, true, "center");

  txt(doc, SITE_CONTACT.addressFull, 23, barY + 8.5, 7, [180, 195, 215], false);

  const copyrightYear = new Date().getFullYear();
  txt(doc, `\u00a9 ${copyrightYear} ${companyName}. All rights reserved.`,
    PW - MR, barY + 8.5, 6.5, [148, 163, 184], false, "right");

  // Plane decoration on right
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(PW - 22, barY, 22, 14, "F");
  txt(doc, "\u2708", PW - 11, barY + 8.5, 11, WHITE, true, "center");

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

export async function generateInvoiceBase64(booking: Booking): Promise<string> {
  const pdf = await generateInvoice(booking);
  return Buffer.from(pdf).toString("base64");
}
