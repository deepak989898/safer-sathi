import { jsPDF } from "jspdf";
import type { Booking } from "@/types";

export interface InvoiceData {
  booking: Booking;
  companyName?: string;
  companyAddress?: string;
  gstNumber?: string;
}

export function generateInvoice(booking: Booking, options?: Partial<InvoiceData>): Uint8Array {
  const doc = new jsPDF();
  const companyName = options?.companyName ?? "Safar Sathi Tours Pvt. Ltd.";
  const companyAddress =
    options?.companyAddress ?? "123 Travel Hub, Connaught Place, New Delhi - 110001";
  const gstNumber = options?.gstNumber ?? "07AABCS1234F1Z5";

  doc.setFontSize(20);
  doc.setTextColor(41, 98, 255);
  doc.text(companyName, 20, 25);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(companyAddress, 20, 32);
  doc.text(`GSTIN: ${gstNumber}`, 20, 38);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", 140, 25);

  doc.setFontSize(10);
  doc.text(`Invoice No: INV-${booking.bookingNumber}`, 140, 32);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 140, 38);
  doc.text(`Booking: ${booking.bookingNumber}`, 140, 44);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 50, 190, 50);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Bill To:", 20, 60);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(booking.customerName, 20, 67);
  doc.text(booking.customerEmail, 20, 73);
  doc.text(booking.customerPhone, 20, 79);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Service Details:", 20, 92);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Service: ${booking.serviceName.en}`, 20, 99);
  doc.text(`Type: ${booking.serviceType}`, 20, 105);
  doc.text(`Travel Date: ${booking.startDate}${booking.endDate ? ` to ${booking.endDate}` : ""}`, 20, 111);
  doc.text(`Guests: ${booking.guests}`, 20, 117);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 125, 190, 125);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Description", 20, 133);
  doc.text("Amount", 160, 133);
  doc.line(20, 136, 190, 136);

  doc.text(booking.serviceName.en, 20, 144);
  doc.text(`₹${booking.amount.toLocaleString("en-IN")}`, 160, 144);

  if (booking.depositAmount) {
    doc.text("Deposit Paid", 20, 152);
    doc.text(`₹${booking.paidAmount.toLocaleString("en-IN")}`, 160, 152);
    const balance = booking.amount - booking.paidAmount;
    if (balance > 0) {
      doc.text("Balance Due", 20, 160);
      doc.text(`₹${balance.toLocaleString("en-IN")}`, 160, 160);
    }
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 170, 190, 170);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Total:", 130, 180);
  doc.text(`₹${booking.amount.toLocaleString("en-IN")}`, 160, 180);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`, 20, 195);
  doc.text(`Status: ${booking.status.toUpperCase()}`, 20, 201);
  doc.text("Thank you for choosing Safar Sathi!", 20, 215);
  doc.text("support@safarsathi.com | +91-9876543210", 20, 221);

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

export function generateInvoiceBase64(booking: Booking): string {
  const pdf = generateInvoice(booking);
  return Buffer.from(pdf).toString("base64");
}
