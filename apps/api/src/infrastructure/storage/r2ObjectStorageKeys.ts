export type R2StorageKeyInput = {
  fileName: string;
  idempotencyKey?: string;
  scopeSegments: readonly string[];
};

export function createR2StorageKey(
  input: R2StorageKeyInput,
  uniqueId: string,
  environmentPrefix: string,
): string {
  const fileName = sanitizeR2FileName(input.fileName);
  const stableId = input.idempotencyKey
    ? sanitizeScopeSegment(input.idempotencyKey)
    : "";
  const uniqueName = stableId
    ? `${stableId}-${fileName}`
    : `${Date.now()}-${uniqueId}-${fileName}`;

  return [
    sanitizeScopeSegment(environmentPrefix),
    ...input.scopeSegments.map(sanitizeScopeSegment),
    uniqueName,
  ].join("/");
}

export function sanitizeR2FileName(fileName: string): string {
  const cleaned = sanitizeScopeSegment(fileName);
  return cleaned || "upload";
}

export function createR2PublicUrl(
  publicBaseUrl: string,
  storageKey: string,
): string {
  return `${publicBaseUrl}/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function sanitizeScopeSegment(segment: string): string {
  return segment
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
