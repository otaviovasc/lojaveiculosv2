import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import type {
  WorkflowPdfContent,
  WorkflowPdfField,
  WorkflowPdfSection,
} from "./vehicleWorkflowPdfContent.js";
import { drawWorkflowPdfHeader } from "./vehicleWorkflowPdfHeader.js";
import { drawWrappedText, wrapText } from "./vehicleWorkflowPdfText.js";
import {
  workflowPdfColors as colors,
  workflowPdfMargins as margins,
  workflowPdfPageSize as pageSize,
  type WorkflowPdfState,
} from "./vehicleWorkflowPdfTheme.js";

export function drawWorkflowPdfLayout(input: {
  bold: PDFFont;
  content: WorkflowPdfContent;
  page: PDFPage;
  pdf: PDFDocument;
  regular: PDFFont;
}) {
  const state: WorkflowPdfState = {
    bold: input.bold,
    page: input.page,
    pageNumber: 1,
    pdf: input.pdf,
    regular: input.regular,
    y: pageSize.height - margins.top,
  };
  drawWorkflowPdfHeader(state, input.content.title, input.content.subtitle);
  drawParagraph(state, input.content.intro, 9.5);
  drawSection(state, input.content.buyer);
  drawSection(state, input.content.vehicle);
  drawSection(state, input.content.finance);
  drawClauses(state, input.content.clauses);
  drawSection(state, input.content.audit, true);
  drawSignatures(state);
  drawFooter(state);
}

function drawSection(
  state: WorkflowPdfState,
  section: WorkflowPdfSection,
  compact = false,
) {
  ensureSpace(state, compact ? 74 : 116);
  drawSectionTitle(state, section.title);
  const columnWidth = (pageSize.width - margins.left - margins.right - 12) / 2;
  for (const [index, field] of section.fields.entries()) {
    const x = margins.left + (index % 2) * (columnWidth + 12);
    const y = state.y - Math.floor(index / 2) * 44;
    drawFieldBox(state, field, x, y, columnWidth);
  }
  state.y -= Math.ceil(section.fields.length / 2) * 44 + 12;
}

function drawClauses(state: WorkflowPdfState, clauses: readonly string[]) {
  drawSectionTitle(state, "Clausulas");
  for (const [index, clause] of clauses.entries()) {
    ensureSpace(state, 58);
    state.page.drawText(`Clausula ${index + 1}`, {
      color: colors.accent,
      font: state.bold,
      size: 8,
      x: margins.left,
      y: state.y,
    });
    state.y -= 13;
    drawParagraph(state, clause, 9);
    state.y -= 4;
  }
}

function drawSectionTitle(state: WorkflowPdfState, title: string) {
  ensureSpace(state, 34);
  state.page.drawText(title.toUpperCase(), {
    color: colors.text,
    font: state.bold,
    size: 9,
    x: margins.left,
    y: state.y,
  });
  state.page.drawLine({
    color: colors.border,
    end: { x: pageSize.width - margins.right, y: state.y - 5 },
    start: { x: margins.left, y: state.y - 5 },
    thickness: 0.6,
  });
  state.y -= 20;
}

function drawFieldBox(
  state: WorkflowPdfState,
  field: WorkflowPdfField,
  x: number,
  y: number,
  width: number,
) {
  state.page.drawRectangle({
    borderColor: colors.border,
    borderWidth: 0.7,
    color: colors.white,
    height: 34,
    width,
    x,
    y: y - 28,
  });
  state.page.drawText(field.label.toUpperCase(), {
    color: colors.muted,
    font: state.bold,
    size: 6.5,
    x: x + 8,
    y: y - 10,
  });
  drawWrappedText({
    color: colors.text,
    font: state.regular,
    lineHeight: 10,
    page: state.page,
    size: 8.3,
    text: field.value,
    width: width - 16,
    x: x + 8,
    y: y - 23,
  });
}

function drawParagraph(state: WorkflowPdfState, text: string, size: number) {
  const width = pageSize.width - margins.left - margins.right;
  for (const line of wrapText(text, width, size, state.regular)) {
    ensureSpace(state, 18);
    state.page.drawText(line, {
      color: colors.text,
      font: state.regular,
      size,
      x: margins.left,
      y: state.y,
    });
    state.y -= size + 5;
  }
}

function drawSignatures(state: WorkflowPdfState) {
  ensureSpace(state, 92);
  state.y -= 22;
  for (const [index, label] of ["Loja / vendedor", "Comprador"].entries()) {
    const x = index === 0 ? margins.left + 24 : margins.left + 278;
    state.page.drawLine({
      color: colors.text,
      end: { x: x + 190, y: state.y },
      start: { x, y: state.y },
    });
    state.page.drawText(label, {
      color: colors.text,
      font: state.bold,
      size: 8,
      x,
      y: state.y - 16,
    });
    state.page.drawText("Assinatura", {
      color: colors.muted,
      font: state.regular,
      size: 7,
      x,
      y: state.y - 28,
    });
  }
}

function drawFooter(state: WorkflowPdfState) {
  state.page.drawLine({
    color: colors.border,
    end: { x: pageSize.width - margins.right, y: 42 },
    start: { x: margins.left, y: 42 },
    thickness: 0.5,
  });
  state.page.drawText(`Pagina ${state.pageNumber}`, {
    color: colors.muted,
    font: state.regular,
    size: 7,
    x: pageSize.width - margins.right - 44,
    y: 28,
  });
}

function ensureSpace(state: WorkflowPdfState, needed: number) {
  if (state.y - needed >= margins.bottom) return;
  drawFooter(state);
  state.page = state.pdf.addPage([pageSize.width, pageSize.height]);
  state.pageNumber += 1;
  state.y = pageSize.height - margins.top;
}
