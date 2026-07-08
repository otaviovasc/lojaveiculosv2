import type {
  DocumentBlock,
  DocumentClauseBlock,
  DocumentFieldGridBlock,
  DocumentHeadingBlock,
  DocumentParagraphBlock,
  DocumentSignatureBlock,
  DocumentTableBlock,
} from "./types.js";

let sequence = 0;

export function heading(text: string): DocumentHeadingBlock {
  return { id: id("heading"), text, type: "heading" };
}

export function paragraph(body: string): DocumentParagraphBlock {
  return { body, id: id("paragraph"), type: "paragraph" };
}

export function clause(label: string, body: string): DocumentClauseBlock {
  return { body, id: id("clause"), label, type: "clause" };
}

export function fields(
  title: string,
  values: readonly { label: string; token: string }[],
): DocumentFieldGridBlock {
  return { fields: values, id: id("fields"), title, type: "field_grid" };
}

export function table(
  title: string,
  columns: readonly string[],
  preset?: string,
): DocumentTableBlock {
  return {
    columns,
    id: id("table"),
    ...(preset ? { preset } : {}),
    title,
    type: "table",
  };
}

export function signatures(roles: readonly string[]): DocumentSignatureBlock {
  return {
    id: id("signature"),
    roles,
    title: "Assinaturas",
    type: "signature",
  };
}

export function blockText(block: DocumentBlock): string | null {
  if (block.type === "clause" || block.type === "paragraph") return block.body;
  if (block.type === "heading") return block.text;
  return null;
}

function id(prefix: string) {
  sequence += 1;
  return `${prefix}_${sequence}`;
}
