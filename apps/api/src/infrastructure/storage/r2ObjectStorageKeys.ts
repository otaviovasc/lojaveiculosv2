export type R2StorageKeyInput = {
  fileName: string;
  scopeSegments: readonly string[];
};

export function createR2StorageKey(
  input: R2StorageKeyInput,
  uniqueId: string,
): string {
  const fileName = sanitizeR2FileName(input.fileName);
  const uniqueName = `${Date.now()}-${uniqueId}-${fileName}`;

  return [...input.scopeSegments.map(sanitizeScopeSegment), uniqueName].join(
    "/",
  );
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
