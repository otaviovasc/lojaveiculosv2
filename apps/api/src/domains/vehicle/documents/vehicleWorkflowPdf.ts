import { PDFDocument, StandardFonts } from "pdf-lib";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import { drawWorkflowPdfLayout } from "./vehicleWorkflowPdfLayout.js";
import { buildWorkflowPdfContent } from "./vehicleWorkflowPdfContent.js";

export async function renderWorkflowDocumentPdf(
  record: CreateVehicleDocumentRecord,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  drawWorkflowPdfLayout({
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    content: buildWorkflowPdfContent(record),
    page: pdf.addPage([595, 842]),
    pdf,
    regular: await pdf.embedFont(StandardFonts.Helvetica),
  });
  return pdf.save();
}
