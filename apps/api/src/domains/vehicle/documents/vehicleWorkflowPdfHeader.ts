import { drawRightText } from "./vehicleWorkflowPdfText.js";
import {
  workflowPdfColors as colors,
  workflowPdfMargins as margins,
  workflowPdfPageSize as pageSize,
  type WorkflowPdfState,
} from "./vehicleWorkflowPdfTheme.js";

export function drawWorkflowPdfHeader(
  state: WorkflowPdfState,
  title: string,
  subtitle: string,
) {
  const width = pageSize.width - margins.left - margins.right;
  state.page.drawRectangle({
    color: colors.soft,
    height: 76,
    width,
    x: margins.left,
    y: state.y - 76,
  });
  state.page.drawRectangle({
    color: colors.accent,
    height: 40,
    width: 40,
    x: margins.left + 12,
    y: state.y - 58,
  });
  state.page.drawText("LV", {
    color: colors.white,
    font: state.bold,
    size: 14,
    x: margins.left + 23,
    y: state.y - 44,
  });
  state.page.drawText("Loja Veiculos", {
    color: colors.text,
    font: state.bold,
    size: 10,
    x: margins.left + 64,
    y: state.y - 30,
  });
  state.page.drawText("Documento gerado pelo fluxo operacional", {
    color: colors.muted,
    font: state.regular,
    size: 8,
    x: margins.left + 64,
    y: state.y - 44,
  });
  drawRightText({
    color: colors.text,
    font: state.bold,
    page: state.page,
    pageWidth: pageSize.width,
    rightMargin: margins.right + 4,
    size: 15,
    text: title,
    y: state.y - 29,
  });
  drawRightText({
    color: colors.muted,
    font: state.regular,
    page: state.page,
    pageWidth: pageSize.width,
    rightMargin: margins.right + 4,
    size: 8,
    text: subtitle,
    y: state.y - 47,
  });
  state.y -= 98;
}
