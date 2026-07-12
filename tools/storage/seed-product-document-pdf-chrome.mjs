import {
  drawFittedText,
  PDF_COLOR,
} from "./seed-product-document-pdf-primitives.mjs";

export function drawSeedDocumentHeader(page, fonts, content) {
  page.drawRectangle({
    color: PDF_COLOR.ink,
    height: 88,
    width: 511.28,
    x: 42,
    y: 716,
  });
  page.drawRectangle({
    color: PDF_COLOR.accent,
    height: 4,
    width: 511.28,
    x: 42,
    y: 712,
  });
  page.drawRectangle({
    color: PDF_COLOR.accent,
    height: 38,
    width: 38,
    x: 56,
    y: 741,
  });
  drawFittedText(page, "LV", fonts.bold, 14, 22, 64, 754, PDF_COLOR.white);
  drawFittedText(
    page,
    content.storeName,
    fonts.bold,
    10,
    190,
    108,
    767,
    PDF_COLOR.white,
  );
  if (content.storeDocument) {
    drawFittedText(
      page,
      content.storeDocument,
      fonts.regular,
      7.5,
      190,
      108,
      753,
      PDF_COLOR.line,
    );
  }
  if (content.contactLine) {
    drawFittedText(
      page,
      content.contactLine,
      fonts.regular,
      7.5,
      190,
      108,
      740,
      PDF_COLOR.line,
    );
  }
  drawFittedText(
    page,
    content.title,
    fonts.bold,
    14,
    205,
    334,
    760,
    PDF_COLOR.white,
    "right",
  );
  drawFittedText(
    page,
    content.subtitle,
    fonts.regular,
    7.5,
    205,
    334,
    741,
    PDF_COLOR.line,
    "right",
  );
}

export function drawSeedDocumentSignatures(page, fonts, signatures) {
  signatures.slice(0, 2).forEach((signature, index) => {
    const x = index === 0 ? 42 : 310;
    page.drawLine({
      color: PDF_COLOR.ink,
      end: { x: x + 243, y: 117 },
      start: { x, y: 117 },
      thickness: 0.8,
    });
    drawFittedText(page, signature, fonts.bold, 8, 243, x, 101, PDF_COLOR.ink);
    page.drawText("Assinatura", {
      color: PDF_COLOR.muted,
      font: fonts.regular,
      size: 7,
      x,
      y: 88,
    });
  });
}

export function drawSeedDocumentFooter(page, fonts, content) {
  page.drawLine({
    color: PDF_COLOR.line,
    end: { x: 553, y: 55 },
    start: { x: 42, y: 55 },
    thickness: 1,
  });
  drawFittedText(
    page,
    `${content.storeName} | Loja Veículos OS`,
    fonts.regular,
    7,
    350,
    42,
    38,
    PDF_COLOR.muted,
  );
  drawFittedText(
    page,
    "Página 1 de 1",
    fonts.regular,
    7,
    100,
    453,
    38,
    PDF_COLOR.muted,
    "right",
  );
}
