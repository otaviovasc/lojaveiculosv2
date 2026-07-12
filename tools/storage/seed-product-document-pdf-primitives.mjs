import { rgb } from "pdf-lib";

export const PDF_COLOR = {
  accent: rgb(0.882, 0.122, 0.149),
  canvas: rgb(0.957, 0.937, 0.933),
  ink: rgb(0.082, 0.082, 0.082),
  line: rgb(0.91, 0.89, 0.886),
  muted: rgb(0.29, 0.267, 0.267),
  white: rgb(1, 1, 1),
};

export function drawFittedText(
  page,
  text,
  font,
  size,
  maxWidth,
  x,
  y,
  color,
  align = "left",
) {
  let value = String(text ?? "");
  while (value.length > 1 && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = `${value.slice(0, -2).trimEnd()}…`;
  }
  const textWidth = font.widthOfTextAtSize(value, size);
  page.drawText(value, {
    color,
    font,
    size,
    x: align === "right" ? x + maxWidth - textWidth : x,
    y,
  });
}

export function drawParagraph(
  page,
  font,
  text,
  size,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
) {
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) =>
    page.drawText(line, {
      color: PDF_COLOR.ink,
      font,
      size,
      x,
      y: y - index * lineHeight,
    }),
  );
  return y - lines.length * lineHeight;
}

export function drawSectionTitle(page, font, title, y) {
  page.drawText(title.toUpperCase(), {
    color: PDF_COLOR.ink,
    font,
    size: 8,
    x: 42,
    y,
  });
  page.drawLine({
    color: PDF_COLOR.line,
    end: { x: 553, y: y - 6 },
    start: { x: 42, y: y - 6 },
    thickness: 1,
  });
  return y - 18;
}

function wrapText(text, font, size, maxWidth) {
  return String(text ?? "")
    .split(/\s+/)
    .reduce((lines, word) => {
      const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
      if (!lines.length || font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = candidate;
      }
      return lines;
    }, []);
}
