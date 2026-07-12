export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isTruthy(value: unknown) {
  return value === true;
}

export function firstString(
  source: Record<string, unknown>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = readString(source[key]);
    if (value) return value;
  }
  return undefined;
}

export function firstNumber(
  source: Record<string, unknown>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = readNumber(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function firstArrayString(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  for (const candidate of value) {
    const string = readString(candidate);
    if (string) return string;
  }
  return undefined;
}

export function cleanRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
