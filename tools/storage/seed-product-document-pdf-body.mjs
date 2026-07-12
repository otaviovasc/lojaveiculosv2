import { drawSeedDocumentSignatures } from "./seed-product-document-pdf-chrome.mjs";
import {
  drawFittedText,
  drawParagraph,
  drawSectionTitle,
  PDF_COLOR,
} from "./seed-product-document-pdf-primitives.mjs";

export function drawSeedDocumentBody(page, fonts, content) {
  drawBadge(page, fonts, "AMBIENTE DE DEMONSTRAÇÃO", 42, 677, 160);
  drawFittedText(
    page,
    content.status.toUpperCase(),
    fonts.bold,
    8,
    100,
    453,
    680,
    PDF_COLOR.accent,
    "right",
  );
  page.drawText("Documento comercial", {
    color: PDF_COLOR.muted,
    font: fonts.regular,
    size: 8,
    x: 42,
    y: 653,
  });
  drawFittedText(
    page,
    content.title,
    fonts.bold,
    21,
    511,
    42,
    623,
    PDF_COLOR.ink,
  );
  let y = drawParagraph(
    page,
    fonts.regular,
    content.statement,
    10,
    42,
    596,
    511,
    15,
    3,
  );

  y = drawSectionTitle(page, fonts.bold, "Dados principais", y - 12);
  y = drawFieldGrid(page, fonts, content.fields, y - 8);
  y = drawSectionTitle(page, fonts.bold, "Declaração", y - 6);
  y = drawParagraph(
    page,
    fonts.regular,
    "As informações acima foram organizadas para conferência. As condições definitivas são aquelas aceitas pelas partes e registradas no fluxo operacional da loja.",
    9.5,
    42,
    y - 10,
    511,
    14,
    3,
  );

  drawDocumentControl(page, fonts, content.issueDate, y);
  drawSeedDocumentSignatures(page, fonts, content.signatures);
}

function drawBadge(page, fonts, label, x, y, width) {
  page.drawRectangle({
    color: PDF_COLOR.canvas,
    height: 20,
    width,
    x,
    y: y - 5,
  });
  drawFittedText(
    page,
    label,
    fonts.bold,
    7,
    width - 20,
    x + 10,
    y + 1,
    PDF_COLOR.accent,
  );
}

function drawFieldGrid(page, fonts, fields, startY) {
  const gap = 10;
  const width = (511 - gap) / 2;
  const height = 48;
  fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 42 + column * (width + gap);
    const y = startY - row * (height + 8) - height;
    page.drawRectangle({
      borderColor: PDF_COLOR.line,
      borderWidth: 1,
      color: PDF_COLOR.canvas,
      height,
      width,
      x,
      y,
    });
    page.drawText(field.label.toUpperCase(), {
      color: PDF_COLOR.muted,
      font: fonts.bold,
      size: 6.5,
      x: x + 11,
      y: y + 31,
    });
    drawFittedText(
      page,
      field.value,
      fonts.regular,
      9,
      width - 22,
      x + 11,
      y + 14,
      PDF_COLOR.ink,
    );
  });
  return startY - Math.ceil(fields.length / 2) * (height + 8);
}

function drawDocumentControl(page, fonts, issueDate, y) {
  page.drawRectangle({
    borderColor: PDF_COLOR.line,
    borderWidth: 1,
    color: PDF_COLOR.canvas,
    height: 50,
    width: 511,
    x: 42,
    y: y - 60,
  });
  page.drawRectangle({
    color: PDF_COLOR.accent,
    height: 50,
    width: 3,
    x: 42,
    y: y - 60,
  });
  page.drawText("CONTROLE DO DOCUMENTO", {
    color: PDF_COLOR.accent,
    font: fonts.bold,
    size: 7,
    x: 56,
    y: y - 25,
  });
  drawFittedText(
    page,
    `Emitido em ${issueDate}. Documento demonstrativo para validação local da experiência de visualização.`,
    fonts.regular,
    8,
    470,
    56,
    y - 42,
    PDF_COLOR.muted,
  );
}
