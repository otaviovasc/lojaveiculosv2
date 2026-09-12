export function readTimestamp(value: unknown, multiplier: number): Date | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const parsed = new Date(numeric * multiplier);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function readRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = readRecord(item);
    return record ? [record] : [];
  });
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
