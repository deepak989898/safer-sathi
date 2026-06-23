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

function drawWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setTextColor(235, 240, 248);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  doc.text("SAFAR SATHI", centerX, centerY, {
    align: "center",
    angle: 35,
  });

  doc.setFontSize(18);
  doc.text("Travel | Comfort | Trust", centerX, centerY + 18, {
    align: "center",
    angle: 35,
  });
}

function drawHeader(doc: jsPDF, logo: Awaited<ReturnType<typeof loadInvoiceLogo>>, options?: Partial<InvoiceData>) {
  const companyName = options?.companyName ?? `${SITE_NAME} Tours Pvt. Ltd.`;
  const companyAddress =
    options?.companyAddress ?? SITE_CONTACT.addressFull;
  const gstNumber = options?.gstNumber ?? "07AABCS1234F1Z5";

  doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.rect(0, 0, 210, 38, "F");
  doc.setFillColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.rect(0, 38, 210, 1.2, "F");

  if (logo) {
    try {
      doc.addImage(
        `data:image/${logo.format.toLowerCase()};base64,${logo.base64}`,
        logo.format,
        14,
        8,
        logo.width,
        logo.height
      );
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(SITE_NAME, 14, 18);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(SITE_NAME, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Travel | Comfort | Trust", 14, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TAX INVOICE", 196, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`GSTIN: ${gstNumber}`, 196, 24, { align: "right" });
  doc.text(companyName, 196, 30, { align: "right" });

  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.setFontSize(8);
  doc.text(companyAddress, 14, 48);
  doc.text(`${SITE_CONTACT.email} | ${SITE_CONTACT.phone}`, 14, 53);
  doc.text(appUrl().replace(/^https?:\/\//, ""), 14, 58);
}

function drawInfoBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  lines: string[]
) {
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, 8 + lines.length * 5.5, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(title, x + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  lines.forEach((line, index) => {
    doc.text(line, x + 4, y + 12 + index * 5.5);
  });
}

export async function generateInvoice(
  booking: Booking,
  options?: Partial<InvoiceData>
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadInvoiceLogo();

  drawWatermark(doc);
  drawHeader(doc, logo, options);

  const invoiceNo = `INV-${booking.bookingNumber}`;
  const invoiceDate = formatDate(new Date().toISOString());
  const travelRange = booking.endDate
    ? `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`
    : formatDate(booking.startDate);
  const balanceDue = Math.max(0, booking.amount - (booking.paidAmount ?? 0));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text("Invoice Details", 14, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`Invoice No: ${invoiceNo}`, 14, 78);
  doc.text(`Invoice Date: ${invoiceDate}`, 14, 83);
  doc.text(`Booking ID: ${booking.bookingNumber}`, 14, 88);
  doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 14, 93);

  drawInfoBox(doc, 14, 100, 88, "Bill To", [
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
  ]);

  drawInfoBox(doc, 108, 100, 88, "Trip Details", [
    booking.serviceName.en,
    `Type: ${booking.serviceType.replace(/_/g, " ")}`,
    `Travel: ${travelRange}`,
    `Guests: ${booking.guests}`,
  ]);

  const tableTop = 138;
  doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.rect(14, tableTop, 182, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Description", 18, tableTop + 5.5);
  doc.text("Qty", 130, tableTop + 5.5);
  doc.text("Amount", 176, tableTop + 5.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, tableTop + 8, 182, 10);
  doc.text(booking.serviceName.en, 18, tableTop + 14.5);
  doc.text(String(booking.guests), 130, tableTop + 14.5);
  doc.text(formatInr(booking.amount), 192, tableTop + 14.5, { align: "right" });

  const totalsY = tableTop + 28;
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(118, totalsY, 78, balanceDue > 0 ? 34 : 26, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Subtotal", 122, totalsY + 8);
  doc.text("Amount Paid", 122, totalsY + 15);
  if (balanceDue > 0) {
    doc.text("Balance Due", 122, totalsY + 22);
  }
  doc.text("Grand Total", 122, totalsY + (balanceDue > 0 ? 29 : 22));

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
  doc.setFontSize(10);
  doc.text(formatInr(booking.amount), 192, totalsY + (balanceDue > 0 ? 29 : 22), {
    align: "right",
  });

  const statusY = totalsY + (balanceDue > 0 ? 42 : 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
  doc.text(`Booking Status: ${booking.status.toUpperCase()}`, 14, statusY);
  doc.text(`Payment: ${booking.paymentStatus.toUpperCase()}`, 14, statusY + 5);

  doc.setDrawColor(BRAND_ORANGE[0], BRAND_ORANGE[1], BRAND_ORANGE[2]);
  doc.line(14, 268, 196, 268);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Thank you for choosing Safar Sathi. This is a computer-generated invoice.", 105, 274, {
    align: "center",
  });
  doc.text(
    "For support, contact support@thesafarsathi.com or +91 9217290871",
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
