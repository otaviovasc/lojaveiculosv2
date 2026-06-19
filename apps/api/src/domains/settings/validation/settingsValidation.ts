const reservedSlugs = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "cdn",
  "dashboard",
  "public",
  "www",
]);

export class StoreSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreSettingsValidationError";
  }
}

export function normalizePublicSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(normalized)) {
    throw new StoreSettingsValidationError(
      "Public slug must use 3-80 lowercase letters, numbers or hyphens.",
    );
  }

  if (reservedSlugs.has(normalized)) {
    throw new StoreSettingsValidationError("Public slug is reserved.");
  }

  return normalized;
}

export function normalizeCustomDomain(domain: string | null): string | null {
  if (!domain) return null;
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");

  if (
    normalized.includes("://") ||
    normalized.includes("/") ||
    normalized.includes(":") ||
    !normalized.includes(".")
  ) {
    throw new StoreSettingsValidationError(
      "Custom domain must be a bare hostname without protocol, path or port.",
    );
  }

  if (!/^[a-z0-9.-]+$/.test(normalized)) {
    throw new StoreSettingsValidationError("Custom domain is invalid.");
  }

  const labels = normalized.split(".");
  if (
    labels.length < 2 ||
    labels.some((label) => !isValidDomainLabel(label)) ||
    labels.at(-1)?.length === 1
  ) {
    throw new StoreSettingsValidationError("Custom domain is invalid.");
  }

  return normalized;
}

function isValidDomainLabel(label: string): boolean {
  return (
    label.length >= 1 &&
    label.length <= 63 &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}
