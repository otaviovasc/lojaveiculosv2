import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DocumentPreview } from "../preview/documentPreview.js";

export async function renderDocumentPreviewPdf(
  preview: DocumentPreview,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 790;

  page.drawText(preview.document.title.slice(0, 90), {
    color: rgb(0.05, 0.09, 0.16),
    font: bold,
    size: 18,
    x: 48,
    y,
  });
  y -= 24;
  page.drawText(`Documento ${preview.document.id}`, {
    color: rgb(0.34, 0.39, 0.45),
    font: regular,
    size: 8,
    x: 48,
    y,
  });
  y -= 28;

  for (const section of preview.sections) {
    page.drawText(section.heading, {
      color: rgb(0.02, 0.48, 0.28),
      font: bold,
      size: 11,
      x: 48,
      y,
    });
    y -= 15;
    for (const line of section.lines) {
      page.drawText(line.slice(0, 110), {
        font: regular,
        size: 9,
        x: 60,
        y,
      });
      y -= 12;
    }
    y -= 8;
  }

  return pdf.save();
}
