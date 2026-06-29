import { relativeLuminance } from "./text-block-colors";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function cleanMarkdownHex(v?: string | null): string | undefined {
  const t = typeof v === "string" ? v.trim() : "";
  return HEX.test(t) ? t : undefined;
}

export interface TextBlockMarkdownColorProps {
  headingColor?: string;
  subheadingColor?: string;
  bodyTextColor?: string;
  listTextColor?: string;
  linkTextColor?: string;
  codeTextColor?: string;
}

export interface ResolvedMarkdownPalette {
  h1: string;
  h2: string;
  h3: string;
  h456: string;
  body: string;
  list: string;
  link: string;
  code: string;
  blockquote: string;
  th: string;
  td: string;
}

/**
 * Per-role markdown colors. Unset roles get defaults from section `baseText`
 * and whether the section uses a dark background (`invert`).
 */
export function resolveTextBlockMarkdownPalette(
  baseText: string,
  invert: boolean,
  raw: TextBlockMarkdownColorProps,
): ResolvedMarkdownPalette {
  const heading = cleanMarkdownHex(raw.headingColor);
  const sub = cleanMarkdownHex(raw.subheadingColor);
  const body = cleanMarkdownHex(raw.bodyTextColor);
  const list = cleanMarkdownHex(raw.listTextColor);
  const link = cleanMarkdownHex(raw.linkTextColor);
  const code = cleanMarkdownHex(raw.codeTextColor);

  const base = baseText;
  const baseIsDark = relativeLuminance(base) < 0.45;

  if (invert) {
    return {
      h1: heading ?? base,
      h2: sub ?? heading ?? (baseIsDark ? "#e7e5e4" : "#fafaf9"),
      h3: sub ?? heading ?? (baseIsDark ? "#e7e5e4" : "#fafaf9"),
      h456: body ?? "#d6d3d1",
      body: body ?? "#e7e5e4",
      list: list ?? body ?? "#e7e5e4",
      link: link ?? "#7dd3fc",
      code: code ?? "#e7e5e4",
      blockquote: body ?? "#d6d3d1",
      th: heading ?? base,
      td: body ?? "#e7e5e4",
    };
  }

  return {
    h1: heading ?? (baseIsDark ? base : "#0c0a09"),
    h2: sub ?? heading ?? (baseIsDark ? "#d6d3d1" : "#57534e"),
    h3: sub ?? heading ?? (baseIsDark ? "#d6d3d1" : "#57534e"),
    h456: body ?? (baseIsDark ? base : "#44403c"),
    body: body ?? (baseIsDark ? base : "#44403c"),
    list: list ?? body ?? (baseIsDark ? base : "#44403c"),
    link: link ?? "#0369a1",
    code: code ?? "#57534e",
    blockquote: body ?? "#57534e",
    th: heading ?? "#0c0a09",
    td: body ?? (baseIsDark ? base : "#44403c"),
  };
}
