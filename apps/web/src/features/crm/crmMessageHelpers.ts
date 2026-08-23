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

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i;
const unsafeUrlCharactersPattern = /[\u0000-\u001f\u007f]/;

export function sanitizeCrmMessageUrl(value: unknown) {
  const candidate = readString(value);
  if (!candidate || unsafeUrlCharactersPattern.test(candidate))
    return undefined;
  if (candidate.startsWith("//") || candidate.startsWith("\\"))
    return undefined;

  try {
    const base = new URL("https://crm.local/");
    const parsed = new URL(candidate, base);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    if (!absoluteUrlPattern.test(candidate) && parsed.origin !== base.origin) {
      return undefined;
    }
    return candidate;
  } catch {
    return undefined;
  }
}

export function readOptionalHref(href?: string) {
  return href ? { href } : {};
}

export function readOptionalMeta(meta?: string) {
  return meta ? { meta } : {};
}
