import type { jsPDF } from "jspdf";

type RGB = readonly [number, number, number];

export const INVOICE_SOCIAL_LINKS = [
  { name: "Facebook", color: [59, 89, 152] as const },
  { name: "Instagram", color: [225, 48, 108] as const },
  { name: "X", color: [15, 20, 25] as const },
  { name: "YouTube", color: [255, 0, 0] as const },
] as const;

function drawFacebook(doc: jsPDF, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(r * 1.35);
  doc.text("f", cx, cy + r * 0.38, { align: "center" });
}

function drawInstagram(doc: jsPDF, cx: number, cy: number, r: number) {
  const s = r * 1.05;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(cx - s, cy - s, s * 2, s * 2, 1.2, 1.2, "S");
  doc.circle(cx, cy, s * 0.42, "S");
  doc.setFillColor(255, 255, 255);
  doc.circle(cx + s * 0.55, cy - s * 0.55, s * 0.14, "F");
}

function drawX(doc: jsPDF, cx: number, cy: number, r: number) {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.45);
  const d = r * 0.55;
  doc.line(cx - d, cy - d, cx + d, cy + d);
  doc.line(cx + d, cy - d, cx - d, cy + d);
}

function drawYoutube(doc: jsPDF, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  const w = r * 0.55;
  const h = r * 0.65;
  doc.triangle(cx - w * 0.35, cy - h, cx - w * 0.35, cy + h, cx + w * 0.9, cy, "F");
}

const DRAWERS = {
  Facebook: drawFacebook,
  Instagram: drawInstagram,
  X: drawX,
  YouTube: drawYoutube,
} as const;

export function drawSocialIcon(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  color: RGB,
  name: keyof typeof DRAWERS
) {
  const r = size / 2;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(cx, cy, r, "F");
  DRAWERS[name](doc, cx, cy, r);
}

export function drawSocialRow(
  doc: jsPDF,
  x: number,
  y: number,
  gap: number,
  size: number
) {
  let sx = x + size / 2;
  for (const link of INVOICE_SOCIAL_LINKS) {
    drawSocialIcon(doc, sx, y, size, link.color, link.name);
    sx += size + gap;
  }
}
