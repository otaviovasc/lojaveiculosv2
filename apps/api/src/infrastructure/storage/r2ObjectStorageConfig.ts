export class R2ObjectStorageConfigError extends Error {
  constructor(fieldName: string) {
    super(`Cloudflare R2 object storage is missing ${fieldName}`);
    this.name = "R2ObjectStorageConfigError";
  }
}

export function validateR2ObjectStorageEnv(
  env: Record<string, string | undefined>,
): boolean {
  const requiredFields = [
    "R2_ACCESS_KEY_ID",
    "R2_BUCKET_NAME",
    "R2_ENDPOINT",
    "R2_PUBLIC_BASE_URL",
    "R2_SECRET_ACCESS_KEY",
  ];
  if (!requiredFields.some((key) => Boolean(env[key]))) return false;

  for (const fieldName of requiredFields) {
    requireR2Env(env, fieldName);
  }
  return true;
}

export function assertR2Option(
  options: Record<string, unknown>,
  fieldName: string,
): void {
  if (!options[fieldName]) {
    throw new R2ObjectStorageConfigError(fieldName);
  }
}

export function requireR2Env(
  env: Record<string, string | undefined>,
  fieldName: string,
): string {
  const value = env[fieldName];
  if (!value || value.startsWith("${{")) {
    throw new R2ObjectStorageConfigError(fieldName);
  }
  return value;
}

export function parseR2ExpiresSeconds(
  value: string | undefined,
  fallback = 900,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
