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

const BRAND_NAVY = [12, 36, 68] as const;
const BRAND_ORANGE = [249, 115, 22] as const;
const MUTED = [100, 116, 139] as const;
const LIGHT_BG = [248, 250, 252] as const;

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string): string {
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

function drawLogoWatermark(
  doc: jsPDF,
  logo: NonNullable<Awaited<ReturnType<typeof loadInvoiceLogo>>>
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const wmW = 110;
  const wmH = 42;
  const x = (pageWidth - wmW) / 2;
  const y = (pageHeight - wmH) / 2 - 10;

  try {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.07 }));
    doc.addImage(
      `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
      logo.format,
      x,
      y,
      wmW,
      wmH
    );
    doc.restoreGraphicsState();
  } catch {
    doc.setTextColor(235, 240, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.text("SAFAR SATHI", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 30,
    });
  }
}

function drawHeader(
  doc: jsPDF,
  logo: Awaited<ReturnType<typeof loadInvoiceLogo>>,
  options?: Partial<InvoiceData>
) {
  const companyName = options?.companyName ?? `${SITE_NAME} Tours Pvt. Ltd.`;
  const companyAddress = options?.companyAddress ?? SITE_CONTACT.addressFull;
  const gstNumber = options?.gstNumber ?? "07AABCS1234F1Z5";

  doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.roundedRect(10, 10, 190, 34, 3, 3, "F");
  doc.setFillColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.rect(10, 42, 190, 1.5, "F");

  if (logo) {
    try {
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        16,
        17,
        logo.width,
        logo.height
      );
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(SITE_NAME, 16, 26);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(SITE_NAME, 16, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Travel | Comfort | Trust", 16, 30);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("TAX INVOICE", 196, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`GSTIN: ${gstNumber}`, 196, 29, { align: "right" });
  doc.text(companyName, 196, 35, { align: "right" });

  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.setFontSize(8);
  doc.text(companyAddress, 14, 52);
  doc.text(`${SITE_CONTACT.email} | ${SITE_CONTACT.phone}`, 14, 57);
  doc.text(appUrl().replace(/^https?:\/\//, ""), 14, 62);
}

function drawInfoBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  lines: string[]
) {
  const height = 10 + lines.length * 5.5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.roundedRect(x, y, w, height, 2, 2, "FD");
  doc.setFillColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.rect(x, y, 3, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(title, x + 6, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  lines.forEach((line, index) => {
    doc.text(line, x + 6, y + 12.5 + index * 5.5);
  });
}

export async function generateInvoice(
  booking: Booking,
  options?: Partial<InvoiceData>
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadInvoiceLogo();

  if (logo) {
    drawLogoWatermark(doc, logo);
  } else {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(240, 244, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(52);
    doc.text("SAFAR SATHI", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 32,
    });
  }

  drawHeader(doc, logo, options);

  const invoiceNo = `INV-${booking.bookingNumber}`;
  const invoiceDate = formatDate(new Date().toISOString());
  const travelRange = booking.endDate
    ? `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`
    : formatDate(booking.startDate);
  const balanceDue = Math.max(0, booking.amount - (booking.paidAmount ?? 0));

  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.roundedRect(14, 68, 182, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text("Invoice Details", 18, 75);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`Invoice No: ${invoiceNo}`, 18, 81);
  doc.text(`Invoice Date: ${invoiceDate}`, 88, 81);
  doc.text(`Booking ID: ${booking.bookingNumber}`, 18, 86);
  doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 88, 86);

  drawInfoBox(doc, 14, 96, 88, "Bill To", [
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
  ]);

  drawInfoBox(doc, 108, 96, 88, "Trip Details", [
    booking.serviceName.en,
    `Type: ${booking.serviceType.replace(/_/g, " ")}`,
    `Travel: ${travelRange}`,
    `Guests: ${booking.guests}`,
  ]);

  const tableTop = 134;
  doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.roundedRect(14, tableTop, 182, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Description", 18, tableTop + 5.5);
  doc.text("Qty", 132, tableTop + 5.5);
  doc.text("Amount", 188, tableTop + 5.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, tableTop + 8, 182, 12, 0, 0, "FD");
  doc.text(booking.serviceName.en, 18, tableTop + 15.5);
  doc.text(String(booking.guests), 132, tableTop + 15.5);
  doc.text(formatInr(booking.amount), 192, tableTop + 15.5, { align: "right" });

  const totalsY = tableTop + 28;
  const totalsHeight = balanceDue > 0 ? 38 : 30;
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.roundedRect(118, totalsY, 78, totalsHeight, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Subtotal", 122, totalsY + 8);
  doc.text("Amount Paid", 122, totalsY + 15);
  if (balanceDue > 0) doc.text("Balance Due", 122, totalsY + 22);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", 122, totalsY + (balanceDue > 0 ? 30 : 22));

  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(formatInr(booking.amount), 192, totalsY + 8, { align: "right" });
  doc.setTextColor(22, 163, 74);
  doc.text(formatInr(booking.paidAmount ?? 0), 192, totalsY + 15, { align: "right" });
  if (balanceDue > 0) {
    doc.setTextColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
    doc.text(formatInr(balanceDue), 192, totalsY + 22, { align: "right" });
  }
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.setFontSize(11);
  doc.text(formatInr(booking.amount), 192, totalsY + (balanceDue > 0 ? 30 : 22), {
    align: "right",
  });

  const statusY = totalsY + totalsHeight + 10;
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.roundedRect(14, statusY, 90, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(`Booking Status: ${booking.status.toUpperCase()}`, 18, statusY + 6);
  doc.text(`Payment: ${booking.paymentStatus.toUpperCase()}`, 18, statusY + 11);

  doc.setDrawColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.setLineWidth(0.4);
  doc.line(14, 268, 196, 268);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Thank you for choosing Safar Sathi. This is a computer-generated invoice.", 105, 274, {
    align: "center",
  });
  doc.text(
    `For support: ${SITE_CONTACT.email} | ${SITE_CONTACT.phone} | ${appUrl().replace(/^https?:\/\//, "")}`,
    105,
    279,
    { align: "center" }
  );

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

export async function generateInvoiceBase64(booking: Booking): Promise<string> {
  const pdf = await generateInvoice(booking);
  return Buffer.from(pdf).toString("base64");
}
