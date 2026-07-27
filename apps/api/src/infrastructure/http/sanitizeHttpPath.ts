const OPAQUE_PATH_SEGMENTS = [
  /^(\/api\/v1\/fiscal\/webhooks\/spedy\/)[^/?#]+/i,
] as const;

export function sanitizeHttpPath(path: string) {
  return OPAQUE_PATH_SEGMENTS.reduce(
    (safePath, pattern) => safePath.replace(pattern, "$1<redacted>"),
    path,
  );
}
