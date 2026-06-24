import type { PDFFont, PDFPage, RGB } from "pdf-lib";

export function drawRightText(input: {
  color: RGB;
  font: PDFFont;
  page: PDFPage;
  pageWidth: number;
  rightMargin: number;
  size: number;
  text: string;
  y: number;
}) {
  const clipped = clipText(input.text, input.font, input.size, 230);
  const width = input.font.widthOfTextAtSize(clipped, input.size);
  input.page.drawText(clipped, {
    color: input.color,
    font: input.font,
    size: input.size,
    x: input.pageWidth - input.rightMargin - width,
    y: input.y,
  });
}

export function drawWrappedText(input: {
  color: RGB;
  font: PDFFont;
  lineHeight: number;
  page: PDFPage;
  size: number;
  text: string;
  width: number;
  x: number;
  y: number;
}) {
  wrapText(input.text, input.width, input.size, input.font).forEach(
    (line, index) => {
      input.page.drawText(line, {
        color: input.color,
        font: input.font,
        size: input.size,
        x: input.x,
        y: input.y - index * input.lineHeight,
      });
    },
  );
}

export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  font: PDFFont,
): readonly string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function clipText(text: string, font: PDFFont, size: number, maxWidth: number) {
  let clipped = text;
  while (
    font.widthOfTextAtSize(clipped, size) > maxWidth &&
    clipped.length > 4
  ) {
    clipped = `${clipped.slice(0, -4)}...`;
  }
  return clipped;
}
