export type HedraGeneratedImageReference = {
  base64?: string;
  contentType?: string;
  url?: string;
};

export function extractGeneratedImage(
  payload: unknown,
): HedraGeneratedImageReference | null {
  for (const record of walkRecords(payload)) {
    const base64 = readString(record.image_base64) ?? readString(record.base64);
    const url =
      readString(record.image_url) ??
      readString(record.imageUrl) ??
      readString(record.generated_image_url) ??
      readString(record.generatedImageUrl) ??
      readString(record.asset_url) ??
      readString(record.assetUrl) ??
      readString(record.download_url) ??
      readString(record.downloadUrl) ??
      readString(record.file_url) ??
      readString(record.fileUrl) ??
      readString(record.media_url) ??
      readString(record.mediaUrl) ??
      readString(record.signed_url) ??
      readString(record.signedUrl) ??
      readString(record.url);
    if (base64 || isImageUrl(url)) {
      const contentType =
        readString(record.content_type) ?? readString(record.contentType);
      return {
        ...(base64 ? { base64 } : {}),
        ...(contentType ? { contentType } : {}),
        ...(url ? { url } : {}),
      };
    }
  }
  return null;
}

export function readGenerationId(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const id =
      readString(record.generation_id) ??
      readString(record.generationId) ??
      readString(record.id);
    if (id) return id;
  }
  return null;
}

export function readGeneratedAssetId(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const id =
      readString(record.asset_id) ??
      readString(record.assetId) ??
      readString(record.generated_asset_id) ??
      readString(record.generatedAssetId) ??
      readString(record.output_asset_id) ??
      readString(record.outputAssetId) ??
      readString(record.image_asset_id) ??
      readString(record.imageAssetId);
    if (id) return id;
  }
  return null;
}

export function readStatusUrl(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const url =
      readString(record.status_url) ??
      readString(record.statusUrl) ??
      readString(record.poll_url) ??
      readString(record.pollUrl);
    if (url) return url;
  }
  return null;
}

export function isCompletedStatus(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const status = readString(record.status)?.toLowerCase();
    if (
      status &&
      ["complete", "completed", "success", "succeeded", "done"].includes(status)
    ) {
      return true;
    }
    const progress = readNumber(record.progress);
    if (progress === 1) return true;
  }
  return false;
}

export function isFailedStatus(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const status = readString(record.status)?.toLowerCase();
    if (
      status &&
      ["failed", "error", "cancelled", "canceled"].includes(status)
    ) {
      return true;
    }
  }
  return false;
}

export function readGenerationProgressDetails(payload: unknown) {
  for (const record of walkRecords(payload)) {
    const status = readString(record.status);
    const progress = readNumber(record.progress);
    if (status || progress !== null) {
      return {
        ...(status ? { providerGenerationStatus: status } : {}),
        ...(progress !== null ? { providerProgress: progress } : {}),
      };
    }
  }
  return {};
}

function* walkRecords(value: unknown): Generator<Record<string, unknown>> {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) yield* walkRecords(item);
    return;
  }
  const record = value as Record<string, unknown>;
  yield record;
  for (const child of Object.values(record)) yield* walkRecords(child);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isImageUrl(value: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}
