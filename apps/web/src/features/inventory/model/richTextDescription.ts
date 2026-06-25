export function nullableRichTextDescription(value: string): string | null {
  const normalized = normalizeRichTextDescription(value);

  return normalized.trim() ? normalized : null;
}

export function normalizeRichTextDescription(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}
