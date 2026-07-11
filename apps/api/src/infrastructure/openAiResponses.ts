export function extractOpenAiResponseOutputText(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = asRecord(item);
    const content = Array.isArray(itemRecord?.content)
      ? itemRecord.content
      : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      if (typeof partRecord?.text === "string") return partRecord.text;
    }
  }
  return null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
