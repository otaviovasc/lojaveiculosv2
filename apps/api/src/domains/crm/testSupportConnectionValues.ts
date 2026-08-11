export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
