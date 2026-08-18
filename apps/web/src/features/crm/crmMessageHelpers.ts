export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readReaction(metadata?: Record<string, unknown>) {
  const reaction = readRecord(readRecord(metadata).reaction);
  return readString(reaction.value);
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readCoordinate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readOptionalHref(href?: string) {
  return href ? { href } : {};
}

export function readOptionalMeta(meta?: string) {
  return meta ? { meta } : {};
}
