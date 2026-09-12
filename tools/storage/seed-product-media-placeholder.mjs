import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const SEED_MEDIA_PLACEHOLDER_VERSION = "photo-pending-webp-v2";

const PLACEHOLDER_BODY = readFileSync(
  new URL(
    "../../apps/web/public/images/storefront/vehicle-photo-pending.webp",
    import.meta.url,
  ),
);

export function createSeedMediaPlaceholder({
  altText,
  listingTitle,
  mediaId,
  targetKey,
}) {
  const label = truncate(listingTitle || altText || "Veículo", 58);
  const suffix = String(mediaId).replaceAll("-", "").slice(-12);
  const fileName = `seed-photo-pending-${suffix}.webp`;
  const separator = targetKey.lastIndexOf("/");
  const storageKey = `${targetKey.slice(0, separator)}/${fileName}`;
  const body = Buffer.from(PLACEHOLDER_BODY);
  const sha256 = createHash("sha256").update(body).digest("hex");

  return {
    altText: `${label}: foto em preparação`,
    body,
    contentType: "image/webp",
    fileName,
    height: 900,
    mediaId,
    originalStorageKey: targetKey,
    sha256,
    sizeBytes: body.byteLength,
    storageKey,
    width: 1600,
  };
}

export function isCurrentSeedMediaPlaceholder(object, placeholder) {
  const metadata = object?.metadata ?? {};
  return Boolean(
    object?.exists &&
    object.contentLength === placeholder.sizeBytes &&
    object.contentType?.startsWith(placeholder.contentType) &&
    metadata.fixture === "local-product-seed" &&
    metadata.placeholder === "true" &&
    metadata.artifactversion === SEED_MEDIA_PLACEHOLDER_VERSION &&
    metadata.artifactsha256 === placeholder.sha256,
  );
}

export function seedMediaPlaceholderMetadata(placeholder) {
  return {
    artifactSha256: placeholder.sha256,
    artifactVersion: SEED_MEDIA_PLACEHOLDER_VERSION,
    fixture: "local-product-seed",
    mediaId: String(placeholder.mediaId),
    placeholder: "true",
  };
}

function truncate(value, length) {
  const text = String(value).trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}
