import { rgb, type PDFFont, type PDFPage, type PDFDocument } from "pdf-lib";

export const workflowPdfPageSize = { height: 842, width: 595 };
export const workflowPdfMargins = {
  bottom: 72,
  left: 48,
  right: 48,
  top: 48,
};
export const workflowPdfColors = {
  accent: rgb(0.02, 0.45, 0.28),
  border: rgb(0.82, 0.86, 0.91),
  muted: rgb(0.38, 0.43, 0.5),
  soft: rgb(0.95, 0.97, 0.96),
  text: rgb(0.05, 0.09, 0.16),
  white: rgb(1, 1, 1),
};

export type WorkflowPdfState = {
  bold: PDFFont;
  page: PDFPage;
  pageNumber: number;
  pdf: PDFDocument;
  regular: PDFFont;
  y: number;
};
